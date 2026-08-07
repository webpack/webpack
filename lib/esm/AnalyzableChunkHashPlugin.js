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
// carries what it resolves to rather than an index into per-build state: a module
// restored from the persistent cache is never generated again, and a stand-in that
// outlived its registry would reach the bundle unreplaced.
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
	try {
		return JSON.parse(
			Buffer.from(
				payload.replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString()
		);
	} catch (_err) {
		return null;
	}
};

/**
 * Whether a specifier may be deferred at all. Substituting rewrites a chunk after its
 * own content hash was taken, so something has to bring the two back in line —
 * `RealContentHashPlugin` is what does, and without it the name would go stale.
 * @param {Compilation} compilation the compilation
 * @returns {boolean} true when deferring is safe
 */
const canDeferSpecifier = (compilation) =>
	Boolean(compilation.options.optimization.realContentHash);

const PLUGIN_NAME = "AnalyzableChunkHashPlugin";

/**
 * Fills in the specifiers reserved during code generation, once the hashes their
 * filenames are built from exist. Runs before `RealContentHashPlugin`, which is what
 * brings each rewritten chunk's own name back in line with its content.
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
					let byId;
					/**
					 * @param {string} payload the encoded half of a stand-in
					 * @returns {string | null} the specifier, or `null` if unresolvable
					 */
					const resolve = (payload) => {
						const read = readSpecifier(payload);
						if (read === null) return null;
						const [prefix, chunkId] = read;
						if (byId === undefined) {
							byId = new Map();
							for (const chunk of compilation.chunks) {
								if (chunk.id !== null) byId.set(String(chunk.id), chunk);
							}
						}
						const chunk = byId.get(String(chunkId));
						if (chunk === undefined) return null;
						const specifier =
							prefix +
							compilation.getPath(
								getJavascriptModulesPlugin().getChunkFilenameTemplate(
									chunk,
									outputOptions
								),
								{ chunk, contentHashType: "javascript" }
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
