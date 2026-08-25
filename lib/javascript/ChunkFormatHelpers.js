/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { getUndoPath } = require("../util/identifier");
const { getChunkFilenameTemplate } = require("./JavascriptModulesPlugin");
const { updateHashForEntryStartup } = require("./StartupHelpers");

/** @import ChunkGraph from "../ChunkGraph" */
/** @import Compilation from "../Compilation" */
/** @import Module from "../Module" */
/** @import Chunk from "../Chunk" */
/** @import Entrypoint from "../Entrypoint" */
/** @import Hash from "../util/Hash" */
/** @import { ChunkHashContext } from "../Compilation" */

const LEADING_SLASHES_REGEXP = /^\/+/g;

/**
 * The path of one chunk's file as written from another's, for the `import`, `require`
 * or loader dependency one emitted chunk states on another.
 * @param {Compilation} compilation the compilation
 * @param {Chunk} fromChunk the chunk the path is written in
 * @param {Chunk} toChunk the chunk the path points at
 * @returns {string} path of `toChunk` relative to `fromChunk`
 */
function getRelativeChunkPath(compilation, fromChunk, toChunk) {
	/**
	 * @param {Chunk} chunk the chunk
	 * @returns {string[]} its output name, split on `/`
	 */
	const outputName = (chunk) =>
		compilation
			.getPath(getChunkFilenameTemplate(chunk, compilation.outputOptions), {
				chunk,
				contentHashType: "javascript"
			})
			.replace(LEADING_SLASHES_REGEXP, "")
			.split("/");
	const from = outputName(fromChunk);
	const to = outputName(toChunk);
	// remove common parts except filename
	while (from.length > 1 && to.length > 1 && from[0] === to[0]) {
		from.shift();
		to.shift();
	}
	const last = to.join("/");
	return getUndoPath(from.join("/"), last, true) + last;
}

/**
 * Returns } Object containing chunk entries and runtime chunk.
 * @param {Chunk} chunk The chunk to get information for
 * @param {ChunkGraph} chunkGraph The chunk graph containing the chunk
 * @returns {{ entries: [Module, Entrypoint | undefined][], runtimeChunk: Chunk | null }} Object containing chunk entries and runtime chunk
 */
function getChunkInfo(chunk, chunkGraph) {
	const entries = [
		...chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)
	];
	const runtimeChunk =
		entries.length > 0
			? /** @type {Entrypoint[][]} */
				(entries)[0][1].getRuntimeChunk()
			: null;

	return {
		entries,
		runtimeChunk
	};
}

/**
 * Creates a chunk hash handler
 * @param {string} name The name of the chunk
 * @returns {(chunk: Chunk, hash: Hash, { chunkGraph }: ChunkHashContext) => void} The chunk hash handler
 */
function createChunkHashHandler(name) {
	/**
	 * Processes the provided chunk.
	 * @param {Chunk} chunk The chunk to get information for
	 * @param {Hash} hash The hash to update
	 * @param {ChunkHashContext} chunkHashContext The chunk hash context
	 * @returns {void}
	 */
	return (chunk, hash, { chunkGraph }) => {
		if (chunk.hasRuntime()) return;
		const { entries, runtimeChunk } = getChunkInfo(chunk, chunkGraph);
		hash.update(name);
		hash.update("1");
		if (runtimeChunk && runtimeChunk.hash) {
			// https://github.com/webpack/webpack/issues/19439
			// Any change to runtimeChunk should trigger a hash update,
			// we shouldn't depend on or inspect its internal implementation.
			// import __webpack_require__ from "./runtime-main.e9400aee33633a3973bd.js";
			hash.update(runtimeChunk.hash);
		}
		updateHashForEntryStartup(hash, chunkGraph, entries, chunk);
	};
}

module.exports = {
	createChunkHashHandler,
	getChunkInfo,
	getRelativeChunkPath
};
