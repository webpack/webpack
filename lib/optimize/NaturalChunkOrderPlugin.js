/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { compareModulesById } = require("../util/comparators");

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
					chunks.sort((chunkA, chunkB) => {
						const cmpFn = compareModulesById(chunkGraph);
						const a = chunkGraph
							.getOrderedChunkModulesIterable(chunkA, cmpFn)
							[Symbol.iterator]();
						const b = chunkGraph
							.getOrderedChunkModulesIterable(chunkB, cmpFn)
							[Symbol.iterator]();
						// eslint-disable-next-line no-constant-condition
						while (true) {
							const aItem = a.next();
							const bItem = b.next();
							if (aItem.done && bItem.done) return 0;
							if (aItem.done) return -1;
							if (bItem.done) return 1;
							const res = cmpFn(aItem.value, bItem.value);
							if (res !== 0) return res;
						}
					});
				}
			);
		});
	}
}

module.exports = NaturalChunkOrderPlugin;
