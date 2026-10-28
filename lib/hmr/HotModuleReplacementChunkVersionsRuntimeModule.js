/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const { compareModulesByIdentifier } = require("../util/comparators");
const createHash = require("../util/createHash");

/** @import Compilation from "../Compilation" */
/** @import Chunk, { ChunkId } from "../graph/Chunk" */

/**
 * Tells the HMR runtime which build each async chunk belongs to, so a chunk file a newer
 * build overwrote is held until the updates leading to it are applied.
 */
class HotModuleReplacementChunkVersionsRuntimeModule extends RuntimeModule {
	constructor() {
		super("hot module replacement chunk versions");
	}

	/**
	 * Whether a chunk's file states its version: a chunk only reached through `import()`.
	 * @param {Compilation} compilation the compilation
	 * @param {Chunk} chunk the chunk
	 * @returns {boolean} true when the chunk is versioned
	 */
	static isVersioned(compilation, chunk) {
		return (
			!chunk.hasRuntime() &&
			!chunk.canBeInitial() &&
			chunk.id !== null &&
			compilation.chunkGraph.getChunkModulesIterableBySourceType(
				chunk,
				"javascript"
			) !== undefined
		);
	}

	/**
	 * The version of a chunk: what its JavaScript modules are in this build.
	 * @param {Compilation} compilation the compilation
	 * @param {Chunk} chunk the chunk
	 * @returns {string} the version
	 */
	static getVersion(compilation, chunk) {
		const { chunkGraph, outputOptions } = compilation;
		const hash = createHash(outputOptions.hashFunction);
		for (const module of chunkGraph.getOrderedChunkModulesIterableBySourceType(
			chunk,
			"javascript",
			compareModulesByIdentifier
		) || []) {
			hash.update(`${chunkGraph.getModuleId(module)}|`);
			hash.update(`${chunkGraph.getModuleHash(module, chunk.runtime)}|`);
		}
		return /** @type {string} */ (hash.digest("hex")).slice(
			0,
			outputOptions.hashDigestLength
		);
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		/** @type {Record<ChunkId, string>} */
		const versions = {};
		for (const chunk of /** @type {Chunk} */ (this.chunk).getAllAsyncChunks()) {
			if (
				!HotModuleReplacementChunkVersionsRuntimeModule.isVersioned(
					compilation,
					chunk
				)
			) {
				continue;
			}
			versions[/** @type {ChunkId} */ (chunk.id)] =
				HotModuleReplacementChunkVersionsRuntimeModule.getVersion(
					compilation,
					chunk
				);
		}
		// A hot update re-runs this module, so the runtime then expects the new versions.
		return `${RuntimeGlobals.hmrChunkVersions} = ${JSON.stringify(versions)};`;
	}
}

module.exports = HotModuleReplacementChunkVersionsRuntimeModule;
