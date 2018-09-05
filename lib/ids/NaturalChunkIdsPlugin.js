/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	compareSelect,
	compareModulesById,
	compareIterables
} = require("../util/comparators");
const assignAscendingChunkIds = require("./assignAscendingChunkIds");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

class NaturalChunkIdsPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalChunkIdsPlugin", compilation => {
			compilation.hooks.chunkIds.tap("NaturalChunkIdsPlugin", chunks => {
				const chunkGraph = compilation.chunkGraph;
				const cmpFn = compareModulesById(chunkGraph);
				const cmpIterableFn = compareIterables(cmpFn);
				const compareNatural = compareSelect(
					/**
					 * @param {Chunk} chunk a chunk
					 * @returns {Iterable<Module>} modules
					 */
					chunk => chunkGraph.getOrderedChunkModulesIterable(chunk, cmpFn),
					cmpIterableFn
				);
				const chunksInNaturalOrder = Array.from(chunks).sort(compareNatural);
				assignAscendingChunkIds(chunksInNaturalOrder, compilation);
			});
		});
	}
}

module.exports = NaturalChunkIdsPlugin;
