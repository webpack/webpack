/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkId} ChunkId */
/** @typedef {import("../Compiler")} Compiler */

const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);
const getCssModulesPlugin = memoize(() => require("../css/CssModulesPlugin"));
const getTemplatedPathPlugin = memoize(() => require("../TemplatedPathPlugin"));

// Looks like a relative specifier, so the code around it needs no special case, and
// carries what it resolves to rather than an index into per-build state — a module
// restored from the persistent cache is never generated again.
const TOKEN_REGEXP = /\.\/@@webpackAnalyzableChunk:([\w-]+)@@/g;

// Stands in for the compilation hash inside an otherwise resolved filename, with the
// requested length when the placeholder asked for one.
const FULL_HASH_TOKEN_REGEXP = /@@webpackFullHash(?:-(\d+))?@@/g;

const FULL_HASH_TOKEN_PREFIX = "@@webpackFullHash";

/**
 * @param {number=} length how many characters the placeholder asked for
 * @returns {string} the stand-in to emit
 */
const reserveFullHash = (length) =>
	`${FULL_HASH_TOKEN_PREFIX}${length === undefined ? "" : `-${length}`}@@`;

/**
 * Whether text still carries a compilation-hash stand-in, so nothing may be resolved
 * against it here — the fill would land inside an already-resolved result.
 * @param {string} value text that may carry one
 * @returns {boolean} true when one is present
 */
const hasReservedFullHash = (value) => value.includes(FULL_HASH_TOKEN_PREFIX);

/**
 * Whether a filename's compilation-hash placeholders can be filled in by the deferred
 * pass at all — a re-encoded digest cannot be spelled by a stand-in.
 * @param {string} template path template
 * @returns {boolean} true when every `[fullhash]` in it is a plain read
 */
const canDeferFullHash = (template) =>
	!getTemplatedPathPlugin().usesFullHashDigest(template);

// `getPath` data that leaves every compilation-hash placeholder as a stand-in while the
// rest of the name resolves — a module's own hash and id are settled during code
// generation, the compilation's is not. Shared: it closes over nothing.
const DEFERRED_FULL_HASH_PATH_DATA = {
	hash: reserveFullHash(),
	hashWithLength: reserveFullHash
};

/**
 * One piece of a name only the deferred pass can spell: text as it stands, the `../`
 * path from the asset it sits in to the output root, a template or `output.publicPath`
 * resolved once the hashes exist, the javascript or stylesheet filename of the chunk
 * with this id, or the base everything else is resolved against once it is spelled.
 * @typedef {"literal" | "undo" | "template" | "publicPath" | "chunk" | "cssChunk" | "base"} SpecifierPartKind
 */

/** @typedef {[SpecifierPartKind, string | number]} SpecifierPart */

const SPECIFIER_PART_KINDS = new Set([
	"literal",
	"undo",
	"template",
	"publicPath",
	"chunk",
	"cssChunk",
	"base"
]);

/**
 * @param {SpecifierPart[]} parts what the stand-in resolves to, in order
 * @returns {string} the stand-in to emit
 */
const reserveSpecifier = (parts) =>
	`./@@webpackAnalyzableChunk:${Buffer.from(JSON.stringify(parts))
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/[=]/g, "")}@@`;

/**
 * @param {string} payload the encoded half of a stand-in
 * @returns {SpecifierPart[] | null} what it resolves to, or `null` if unreadable
 */
const readSpecifier = (payload) => {
	/** @type {EXPECTED_ANY} */
	let decoded;
	try {
		decoded = JSON.parse(
			Buffer.from(
				payload.replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString()
		);
	} catch (_error) {
		return null;
	}
	// Source of our own can spell the token too, so nothing about its payload is given.
	if (!Array.isArray(decoded)) return null;
	for (const part of decoded) {
		if (!Array.isArray(part) || part.length !== 2) return null;
		if (!SPECIFIER_PART_KINDS.has(part[0])) return null;
		// Only a chunk id may be a number; the rest are read as text.
		if (
			typeof part[1] !== "string" &&
			((part[0] !== "chunk" && part[0] !== "cssChunk") ||
				typeof part[1] !== "number")
		) {
			return null;
		}
	}
	return decoded;
};

const PLUGIN_NAME = "AnalyzableChunkHashPlugin";

// More than one plugin reserves stand-ins, and each has to bring the pass that fills
// them in — but only the first application of it.
/** @type {WeakSet<Compiler>} */
const appliedTo = new WeakSet();

/**
 * Fills in the names reserved during code generation, once the hashes they are built
 * from exist: a chunk's own filename, and the compilation hash inside any other
 * emitted asset's. Replaces in place so the asset keeps its mappings, and runs before
 * anything reads it — `RealContentHashPlugin` still repairs each rewritten chunk's own
 * name later.
 */
class AnalyzableChunkHashPlugin {
	/**
	 * Apply the plugin. Applying it more than once to a compiler is a no-op.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		if (appliedTo.has(compiler)) return;
		appliedTo.add(compiler);
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					// Before source maps are written and before a minifier runs: both read
					// the asset, and a stand-in is a different length than what replaces it.
					// Every hash it reads is already settled — `createHash` runs ahead of
					// every `processAssets` stage — and `RealContentHashPlugin` still repairs
					// the names afterwards.
					stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED
				},
				() => {
					const { outputOptions } = compilation;
					const fullHash = compilation.hash;
					/** @type {Map<string, Chunk> | undefined} */
					let chunksById;
					/**
					 * @param {string} value text that may carry compilation-hash stand-ins
					 * @returns {string} the text with each of them filled in
					 */
					const fillFullHash = (value) => {
						if (fullHash === undefined) return value;
						FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
						return value.replace(FULL_HASH_TOKEN_REGEXP, (_match, length) =>
							length === undefined
								? fullHash
								: fullHash.slice(0, Number(length))
						);
					};
					/**
					 * @param {string} payload the encoded half of a stand-in
					 * @param {string} assetName name of the asset the stand-in sits in
					 * @returns {string | null} the specifier, or `null` if unresolvable
					 */
					const resolve = (payload, assetName) => {
						const parts = readSpecifier(payload);
						if (parts === null) return null;
						/** @type {string | undefined} */
						let base;
						let specifier = "";
						for (const [kind, value] of parts) {
							if (kind === "base") {
								base = /** @type {string} */ (value);
							} else if (kind === "literal") {
								specifier += value;
							} else if (kind === "undo") {
								specifier += getUndoPath(
									assetName,
									/** @type {string} */ (outputOptions.path),
									true
								);
							} else if (kind === "template") {
								specifier += compilation.getPath(
									/** @type {string} */ (value),
									{}
								);
							} else if (kind === "publicPath") {
								specifier += compilation.getPath(
									outputOptions.publicPath || "",
									{}
								);
							} else {
								if (chunksById === undefined) {
									chunksById = new Map();
									for (const chunk of compilation.chunks) {
										if (chunk.id !== null) {
											chunksById.set(String(chunk.id), chunk);
										}
									}
								}
								const chunk = chunksById.get(String(value));
								if (chunk === undefined) return null;
								const css = kind === "cssChunk";
								specifier += compilation.getPath(
									css
										? getCssModulesPlugin().getChunkFilenameTemplate(
												chunk,
												outputOptions
											)
										: getJavascriptModulesPlugin().getChunkFilenameTemplate(
												chunk,
												outputOptions
											),
									// Matches what names the asset, or a placeholder resolved here would
									// not be the one on disk.
									{
										chunk,
										runtime: chunk.runtime,
										contentHashType: css ? "css" : "javascript"
									}
								);
							}
						}
						if (base !== undefined) {
							// An entry base replaces the output root, so the rest is read against it
							// here exactly as the runtime would have read it against `.b`.
							try {
								return new URL(fillFullHash(specifier), base).href;
							} catch (_error) {
								return null;
							}
						}
						// A bare specifier is a package name, so make it explicitly relative the way
						// the chunk loader does. A literal part may still carry a stand-in of its own,
						// so finish those here rather than scanning again.
						return fillFullHash(
							/^(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(specifier)
								? specifier
								: `./${specifier}`
						);
					};
					for (const name of Object.keys(compilation.assets)) {
						const content = compilation.assets[name].source();
						if (typeof content !== "string") continue;
						TOKEN_REGEXP.lastIndex = 0;
						FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
						const hasChunkToken = TOKEN_REGEXP.test(content);
						const hasFullHashToken =
							fullHash !== undefined && FULL_HASH_TOKEN_REGEXP.test(content);
						if (!hasChunkToken && !hasFullHashToken) continue;
						// Replaced in place rather than rebuilt from a string: a stand-in and
						// the name filling it in are different lengths, so everything after it
						// shifts and the asset's existing mappings have to move with it.
						const replaced = new ReplaceSource(compilation.assets[name]);
						/**
						 * @param {RegExp} source what to look for
						 * @param {(match: string, group: string) => string | null} fill what to put there
						 * @returns {void}
						 */
						const replaceAll = (source, fill) => {
							// Its own instance: `fill` may run the shared one over what it
							// returns, and a `replace` there would rewind this scan.
							const regexp = new RegExp(source.source, source.flags);
							/** @type {RegExpExecArray | null} */
							let match;
							while ((match = regexp.exec(content)) !== null) {
								const value = fill(match[0], match[1]);
								if (value === null) continue;
								replaced.replace(
									match.index,
									match.index + match[0].length - 1,
									value
								);
							}
						};
						if (hasChunkToken) {
							replaceAll(TOKEN_REGEXP, (_match, payload) =>
								resolve(payload, name)
							);
						}
						if (hasFullHashToken) {
							replaceAll(FULL_HASH_TOKEN_REGEXP, (match) =>
								fillFullHash(match)
							);
						}
						compilation.updateAsset(name, replaced);
					}
				}
			);
		});
	}
}

module.exports = AnalyzableChunkHashPlugin;
module.exports.DEFERRED_FULL_HASH_PATH_DATA = DEFERRED_FULL_HASH_PATH_DATA;
module.exports.canDeferFullHash = canDeferFullHash;
module.exports.hasReservedFullHash = hasReservedFullHash;
module.exports.readSpecifier = readSpecifier;
module.exports.reserveSpecifier = reserveSpecifier;
