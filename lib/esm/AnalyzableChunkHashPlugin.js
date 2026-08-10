/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const memoize = require("../util/memoize");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkId} ChunkId */
/** @typedef {import("../Compiler")} Compiler */

const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);

// Looks like a relative specifier, so the code around it needs no special case, and
// carries what it resolves to rather than an index into per-build state — a module
// restored from the persistent cache is never generated again.
const TOKEN_REGEXP = /\.\/@@webpackAnalyzableChunk:([\w-]+)@@/g;

/**
 * @param {string} prefix what goes in front of the chunk's filename
 * @param {ChunkId} chunkId id of the chunk being addressed
 * @returns {string} the stand-in to emit
 */
const reserveSpecifier = (prefix, chunkId) =>
	`./@@webpackAnalyzableChunk:${Buffer.from(JSON.stringify([prefix, chunkId]))
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/[=]/g, "")}@@`;

/**
 * @param {string} payload the encoded half of a stand-in
 * @returns {[string, ChunkId] | null} prefix and chunk id, or `null` if unreadable
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
	if (!Array.isArray(decoded) || decoded.length !== 2) return null;
	const [prefix, chunkId] = decoded;
	if (typeof prefix !== "string") return null;
	if (typeof chunkId !== "string" && typeof chunkId !== "number") return null;
	return [prefix, chunkId];
};

/**
 * Whether a specifier may be deferred at all. Substituting rewrites a chunk after its
 * own content hash was taken, and `RealContentHashPlugin` is what brings the two back
 * in line — without it the name would go stale.
 * @param {Compilation} compilation the compilation
 * @returns {boolean} true when deferring is safe
 */
const canDeferSpecifier = (compilation) =>
	Boolean(compilation.options.optimization.realContentHash);

const PLUGIN_NAME = "AnalyzableChunkHashPlugin";

/**
 * Fills in the specifiers reserved during code generation, once the hashes their
 * filenames are built from exist. Runs before `RealContentHashPlugin`, which repairs
 * each rewritten chunk's own name.
 */
class AnalyzableChunkHashPlugin {
	/**
	 * Apply the plugin.
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH - 1
				},
				() => {
					const { outputOptions } = compilation;
					/** @type {Map<string, Chunk> | undefined} */
					let chunksById;
					/**
					 * @param {string} payload the encoded half of a stand-in
					 * @returns {string | null} the specifier, or `null` if unresolvable
					 */
					const resolve = (payload) => {
						const decoded = readSpecifier(payload);
						if (decoded === null) return null;
						const [prefix, chunkId] = decoded;
						if (chunksById === undefined) {
							chunksById = new Map();
							for (const chunk of compilation.chunks) {
								if (chunk.id !== null) chunksById.set(String(chunk.id), chunk);
							}
						}
						const chunk = chunksById.get(String(chunkId));
						if (chunk === undefined) return null;
						const specifier =
							prefix +
							compilation.getPath(
								getJavascriptModulesPlugin().getChunkFilenameTemplate(
									chunk,
									outputOptions
								),
								// Matches what `JavascriptModulesPlugin` names the asset with, or a
								// placeholder resolved here would not be the one on disk.
								{
									chunk,
									runtime: chunk.runtime,
									contentHashType: "javascript"
								}
							);
						// A bare specifier is a package name, so make it explicitly relative
						// the way the chunk loader does.
						return /^(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(specifier)
							? specifier
							: `./${specifier}`;
					};
					for (const name of Object.keys(compilation.assets)) {
						const content = compilation.assets[name].source();
						if (typeof content !== "string") continue;
						TOKEN_REGEXP.lastIndex = 0;
						if (!TOKEN_REGEXP.test(content)) continue;
						TOKEN_REGEXP.lastIndex = 0;
						compilation.updateAsset(
							name,
							new RawSource(
								content.replace(TOKEN_REGEXP, (match, payload) => {
									const specifier = resolve(payload);
									return specifier === null ? match : specifier;
								})
							)
						);
					}
				}
			);
		});
	}
}

module.exports = AnalyzableChunkHashPlugin;
module.exports.canDeferSpecifier = canDeferSpecifier;
module.exports.reserveSpecifier = reserveSpecifier;
