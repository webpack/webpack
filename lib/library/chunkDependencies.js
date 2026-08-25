/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { getRelativeChunkPath } = require("../javascript/ChunkFormatHelpers");
const { getAllChunks } = require("../javascript/ChunkHelpers");
const { chunkHasJs } = require("../javascript/JavascriptModulesPlugin");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../util/Hash")} Hash */

const JS_EXTENSION_REGEXP = /\.js$/;

/**
 * The chunks a chunk without a runtime of its own must be loaded after: the one
 * carrying its runtime, and those of every entrypoint it depends on.
 * @param {Chunk} chunk the chunk being rendered
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {Set<Chunk>} chunks to load first, empty when the chunk carries its runtime
 */
const getChunkDependencies = (chunk, chunkGraph) => {
	/** @type {Set<Chunk>} */
	const dependencies = new Set();
	if (chunk.hasRuntime()) return dependencies;
	for (const [
		,
		entrypoint
	] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
		for (const dependency of getAllChunks(
			/** @type {Entrypoint} */ (entrypoint),
			chunk
		)) {
			if (chunkHasJs(dependency, chunkGraph)) dependencies.add(dependency);
		}
	}
	return dependencies;
};

module.exports.getChunkDependencies = getChunkDependencies;

/**
 * The same chunks as paths relative to this one, which is what System resolves a
 * dependency id as.
 * @param {Chunk} chunk the chunk being rendered
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Compilation} compilation the compilation
 * @returns {string[]} paths of the chunks to load first
 */
module.exports.getChunkDependencyPaths = (chunk, chunkGraph, compilation) =>
	Array.from(getChunkDependencies(chunk, chunkGraph), (dependency) =>
		getRelativeChunkPath(compilation, chunk, dependency)
	);

/**
 * An AMD loader appends `.js` to a relative id and reads one that carries it as a
 * path against the base url instead, so the extension comes off.
 * @param {string} path path of a chunk relative to the one depending on it
 * @returns {string} the AMD module id
 */
module.exports.toAmdModuleId = (path) => path.replace(JS_EXTENSION_REGEXP, "");

/**
 * A dependency chunk's file name is written into this chunk, so its content hash has
 * to reach this chunk's hash the way #19439 established, without reading into it.
 * @param {Hash} hash the hash to update
 * @param {Chunk} chunk the chunk being rendered
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {void}
 */
module.exports.updateHashForChunkDependencies = (hash, chunk, chunkGraph) => {
	for (const dependency of getChunkDependencies(chunk, chunkGraph)) {
		hash.update(`${dependency.id}`);
		if (dependency.hash) hash.update(dependency.hash);
	}
};
