/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");

/** @import Chunk from "../graph/Chunk" */
/** @import ChunkGraph from "../graph/ChunkGraph" */

/**
 * Base class for runtime modules that only emit helper functions and do not
 * need special staging or attachment behavior beyond `RuntimeModule`.
 */
class HelperRuntimeModule extends RuntimeModule {
	/**
	 * Creates a helper runtime module with the provided readable name.
	 * @param {string} name a readable name
	 */
	constructor(name) {
		super(name);
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		// A helper defines a function on the require global and nothing else.
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Whether a hot update can deliver this helper, which then runs outside the
	 * bootstrap scope and reaches its state only through `__webpack_require__`.
	 * @returns {boolean} true, when the runtime accepts hot updates
	 */
	receivesHotUpdates() {
		return /** @type {ChunkGraph} */ (this.chunkGraph)
			.getTreeRuntimeRequirements(/** @type {Chunk} */ (this.chunk))
			.has(RuntimeGlobals.hmrDownloadManifest);
	}
}

module.exports = HelperRuntimeModule;
