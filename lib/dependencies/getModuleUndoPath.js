/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const { getUndoPath } = require("../util/identifier");

/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */

/**
 * Computes the `../`-path from the consuming module's chunk(s) back to the output
 * root, so a chunk or asset can be referenced relative to `import.meta.url`. Returns
 * `null` when the module lives in chunks of different depths (no single path works).
 * @param {Module} module the consuming module
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Compilation} compilation the compilation
 * @returns {string | null} relative undo path, or `null` when ambiguous
 */
const getModuleUndoPath = (module, chunkGraph, compilation) => {
	const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

	const { outputOptions } = compilation;
	const outputPath = /** @type {string} */ (outputOptions.path);
	/** @type {string | null} */
	let result = null;
	let found = false;
	for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
		const chunkName = compilation.getPath(
			JavascriptModulesPlugin.getChunkFilenameTemplate(chunk, outputOptions),
			{ chunk, contentHashType: JAVASCRIPT_TYPE }
		);
		const undo = getUndoPath(chunkName, outputPath, true);
		if (!found) {
			result = undo;
			found = true;
		} else if (result !== undo) {
			return null;
		}
	}
	return found ? result : null;
};

module.exports = getModuleUndoPath;
