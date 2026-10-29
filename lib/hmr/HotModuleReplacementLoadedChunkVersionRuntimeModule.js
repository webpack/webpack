/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const HotModuleReplacementChunkVersionsRuntimeModule = require("./HotModuleReplacementChunkVersionsRuntimeModule");

/** @import Compilation from "../Compilation" */
/** @import Chunk, { ChunkId } from "../graph/Chunk" */

/**
 * Runs in an async chunk when it is installed and records which build the file is from.
 */
class HotModuleReplacementLoadedChunkVersionRuntimeModule extends RuntimeModule {
	/**
	 * @param {ChunkId} chunkId the id of the chunk it runs in
	 */
	constructor(chunkId) {
		super("hot module replacement loaded chunk version");
		/** @type {ChunkId} */
		this.chunkId = chunkId;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		// One per chunk, and code generation is cached by identifier and runtime.
		return `${super.identifier()}|${this.chunkId}`;
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
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
		const chunk = /** @type {Chunk} */ (this.chunk);
		const version = HotModuleReplacementChunkVersionsRuntimeModule.getVersion(
			compilation,
			chunk
		);
		return `${RuntimeGlobals.hmrLoadedChunkVersions}[${JSON.stringify(
			chunk.id
		)}] = ${JSON.stringify(version)};`;
	}
}

module.exports = HotModuleReplacementLoadedChunkVersionRuntimeModule;
