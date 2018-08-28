/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareModulesById, compareIterables } = require("../util/comparators");

/** @typedef {import("../Compiler")} Compiler */

class NaturalChunkOrderPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NaturalChunkOrderPlugin", compilation => {
			compilation.hooks.optimizeChunkOrder.tap(
				"NaturalChunkOrderPlugin",
				chunks => {
					const chunkGraph = compilation.chunkGraph;
					const cmpFn = compareModulesById(chunkGraph);
					const cmpIterableFn = compareIterables(cmpFn);
					chunks.sort((chunkA, chunkB) => {
						const a = chunkGraph.getOrderedChunkModulesIterable(chunkA, cmpFn);
						const b = chunkGraph.getOrderedChunkModulesIterable(chunkB, cmpFn);
						return cmpIterableFn(a, b);
					});
				}
			);
		});
	}
}

module.exports = NaturalChunkOrderPlugin;
