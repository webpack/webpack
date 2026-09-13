/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");

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
}

module.exports = HelperRuntimeModule;
