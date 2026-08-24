/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { CachedSource, ReplaceSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");

/** @import Chunk, { ChunkFilenameTemplate } from "../Chunk" */
/** @import Compiler from "../Compiler" */
/**
 * @import {
 * 	OutputNormalizedWithDefaults as OutputOptions
 * } from "../config/defaults"
 */
/** @import { Source } from "webpack-sources" */

const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);
const getCssModulesPlugin = memoize(() => require("../css/CssModulesPlugin"));

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

// `getPath` data that leaves every compilation-hash placeholder as a stand-in while the
// rest of the name resolves — a module's own hash and id are settled during code
// generation, the compilation's is not. Shared: it closes over nothing.
const DEFERRED_FULL_HASH_PATH_DATA = {
	hash: reserveFullHash(),
	hashWithLength: reserveFullHash
};

/**
 * @typedef {object} ChunkAssetNaming
 * @property {(chunk: Chunk, outputOptions: OutputOptions) => ChunkFilenameTemplate} template what names the asset
 * @property {string} contentHashType which of the chunk's hashes the name reads
 */

/**
 * How each chunk-naming stand-in is spelled once the hashes exist, keyed rather than
 * branched on so a kind this pass does not answer for resolves to nothing instead of
 * silently taking another's name. `RuntimeTemplate` reserves only what is keyed here.
 * @type {Map<string, ChunkAssetNaming>}
 */
const CHUNK_ASSET_NAMING = new Map([
	[
		"chunk",
		{
			template: (chunk, outputOptions) =>
				getJavascriptModulesPlugin().getChunkFilenameTemplate(
					chunk,
					outputOptions
				),
			contentHashType: "javascript"
		}
	],
	[
		"cssChunk",
		{
			template: (chunk, outputOptions) =>
				getCssModulesPlugin().getChunkFilenameTemplate(chunk, outputOptions),
			contentHashType: "css"
		}
	]
]);

/**
 * One piece of a name only the deferred pass can spell: text as it stands, the `../`
 * path from the asset it sits in to the output root, a template or `output.publicPath`
 * resolved once the hashes exist, one of the assets the chunk with this id emits, or
 * the base everything else is resolved against once it is spelled.
 * @typedef {"literal" | "undo" | "template" | "publicPath" | "chunk" | "cssChunk" | "base"} SpecifierPartKind
 */

/** @typedef {[SpecifierPartKind, string | number]} SpecifierPart */

const SPECIFIER_PART_KINDS = new Set([
	"literal",
	"undo",
	"template",
	"publicPath",
	"base",
	...CHUNK_ASSET_NAMING.keys()
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
			(!CHUNK_ASSET_NAMING.has(part[0]) || typeof part[1] !== "number")
		) {
			return null;
		}
	}
	return decoded;
};

/**
 * first character, last character, replacement.
 * @typedef {[number, number, string]} Replacement
 */

const PASS_NAME = "analyzableChunkNaming";

/**
 * Fills in the names reserved during code generation, once the hashes they are built
 * from exist: a chunk's own filename, and the compilation hash inside any other
 * emitted asset's. Replaces in place so the asset keeps its mappings, and runs before
 * anything reads it — `RealContentHashPlugin` still repairs each rewritten chunk's own
 * name later. Registered wherever `output.module` is read, since nothing reserves a
 * stand-in without it — a reservation cannot arrange this itself, as a module restored
 * from the cache carries one without being generated again.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const fillReservedNames = (compiler) => {
	compiler.hooks.compilation.tap(PASS_NAME, (compilation) => {
		const cache = compilation.getCache(PASS_NAME);
		compilation.hooks.processAssets.tapPromise(
			{
				name: PASS_NAME,
				// Before source maps are written and before a minifier runs: both read
				// the asset, and a stand-in is a different length than what replaces it.
				// Every hash it reads is already settled — `createHash` runs ahead of
				// every `processAssets` stage — and `RealContentHashPlugin` still repairs
				// the names afterwards.
				stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED
			},
			async () => {
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
						length === undefined ? fullHash : fullHash.slice(0, Number(length))
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
							const naming = CHUNK_ASSET_NAMING.get(kind);
							// Nothing reserves a kind this pass cannot spell, so one arriving
							// here was written by something else and names no asset of ours.
							if (naming === undefined) return null;
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
							specifier += compilation.getPath(
								naming.template(chunk, outputOptions),
								// Matches what names the asset, or a placeholder resolved here would
								// not be the one on disk.
								{
									chunk,
									runtime: chunk.runtime,
									contentHashType: naming.contentHashType
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
				/** @type {{ name: string, source: Source, replacements: Replacement[] }[]} */
				const tasks = [];

				for (const name of Object.keys(compilation.assets)) {
					const source = compilation.assets[name];
					const content = source.source();
					if (typeof content !== "string") continue;
					TOKEN_REGEXP.lastIndex = 0;
					FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
					const hasChunkToken = TOKEN_REGEXP.test(content);
					const hasFullHashToken =
						fullHash !== undefined && FULL_HASH_TOKEN_REGEXP.test(content);
					if (!hasChunkToken && !hasFullHashToken) continue;
					/** @type {Replacement[]} */
					const replacements = [];
					/**
					 * @param {RegExp} pattern what to look for
					 * @param {(match: string, group: string) => string | null} fill what to put there
					 * @returns {void}
					 */
					const collect = (pattern, fill) => {
						// Its own instance: `fill` may run the shared one over what it
						// returns, and a `replace` there would rewind this scan.
						const regexp = new RegExp(pattern.source, pattern.flags);
						/** @type {RegExpExecArray | null} */
						let match;
						while ((match = regexp.exec(content)) !== null) {
							const value = fill(match[0], match[1]);
							if (value === null) continue;
							replacements.push([
								match.index,
								match.index + match[0].length - 1,
								value
							]);
						}
					};
					if (hasChunkToken) {
						collect(TOKEN_REGEXP, (_match, payload) => resolve(payload, name));
					}
					if (hasFullHashToken) {
						collect(FULL_HASH_TOKEN_REGEXP, (match) => fillFullHash(match));
					}
					if (replacements.length === 0) continue;

					tasks.push({ name, source, replacements });
				}
				if (tasks.length === 0) return;

				await Promise.all(
					tasks.map(async ({ name, source, replacements }) => {
						const replaced = await cache.providePromise(
							name,
							cache.mergeEtags(
								cache.getLazyHashedEtag(source),
								JSON.stringify(replacements)
							),
							() => {
								const replacedSource = new ReplaceSource(source);
								for (const [start, end, value] of replacements) {
									replacedSource.replace(start, end, value);
								}
								return new CachedSource(replacedSource);
							}
						);
						compilation.updateAsset(name, replaced);
					})
				);
			}
		);
	});
};

module.exports.DEFERRED_FULL_HASH_PATH_DATA = DEFERRED_FULL_HASH_PATH_DATA;
module.exports.fillReservedNames = fillReservedNames;
module.exports.hasReservedFullHash = hasReservedFullHash;
module.exports.reserveSpecifier = reserveSpecifier;
