/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");
const Template = require("../template/Template");

/**
 * Holds a chunk loaded by a hot module until the chunk fits the running code. Only a
 * runtime that loads chunks has it, so the core HMR runtime stays the same either way.
 */
class HotModuleReplacementChunkVersionCheckRuntimeModule extends RuntimeModule {
	/**
	 * Creates an instance of HotModuleReplacementChunkVersionCheckRuntimeModule.
	 */
	constructor() {
		super("hot module replacement chunk version check");
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
		return Template.getFunctionContent(
			require("./HotModuleReplacementChunkVersionCheck.runtime")
		)
			.replace(/\$hmrChunkGroups\$/g, RuntimeGlobals.hmrChunkGroups)
			.replace(/\$hmrChunkVersions\$/g, RuntimeGlobals.hmrChunkVersions)
			.replace(
				/\$hmrLoadedChunkVersions\$/g,
				RuntimeGlobals.hmrLoadedChunkVersions
			)
			.replace(
				/\$hmrCheckChunkVersions\$/g,
				RuntimeGlobals.hmrCheckChunkVersions
			);
	}
}

module.exports = HotModuleReplacementChunkVersionCheckRuntimeModule;
