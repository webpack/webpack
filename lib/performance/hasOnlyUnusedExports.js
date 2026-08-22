/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { UsageState } = require("../ExportsInfo");

/** @import ChunkGraph from "../ChunkGraph" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * Tells whether a module provides exports and no runtime uses any of them.
 * One exporting nothing is there for its side effects, a different mistake.
 * @param {Module} module the module to look up
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {boolean} true when it provides exports and none are used
 */
const hasOnlyUnusedExports = (module, moduleGraph, chunkGraph) => {
	const runtimes = [...chunkGraph.getModuleRuntimes(module)];
	let provided = 0;

	for (const exportInfo of moduleGraph.getExportsInfo(module).exports) {
		if (!exportInfo.provided) continue;

		provided++;

		for (const runtime of runtimes) {
			// `NoInfo` included: unknown usage is not unused.
			if (exportInfo.getUsed(runtime) !== UsageState.Unused) return false;
		}
	}

	return provided > 0;
};

module.exports = hasOnlyUnusedExports;
