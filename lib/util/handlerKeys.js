/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @import RuntimeModule from "../RuntimeModule" */

/**
 * The one key a chunk's runtime modules install on a handler map, or `null` when
 * they install several, none, or one a module could not name. Every module states
 * what it installs, so nothing has to be rendered to find out.
 * @param {RuntimeModule} runtimeModule the runtime module rendering the dispatch
 * @param {string} handlers the handler map global
 * @returns {string | null} the sole handler key, or `null`
 */
const getOnlyHandlerKey = (runtimeModule, handlers) => {
	const { chunkGraph, chunk } = runtimeModule;
	if (chunkGraph === undefined || chunk === undefined) return null;
	/** @type {string | null} */
	let only = null;
	for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
		const installed = module.getInstalledChunkHandlers();
		// A module that cannot name what it installs leaves every map unknowable.
		if (installed === null) return null;
		for (const [map, key] of installed) {
			if (map !== handlers) continue;
			if (only !== null && only !== key) return null;
			only = key;
		}
	}
	return only;
};

module.exports.getOnlyHandlerKey = getOnlyHandlerKey;
