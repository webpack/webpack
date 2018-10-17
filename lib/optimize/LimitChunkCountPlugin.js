/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/LimitChunkCountPlugin.json");
const { STAGE_ADVANCED } = require("../OptimizationStages");
const { compareChunks } = require("../util/comparators");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

/** @typedef {import("../../declarations/plugins/optimize/LimitChunkCountPlugin").LimitChunkCountPluginOptions} LimitChunkCountPluginOptions */

class LimitChunkCountPlugin {
	/**
	 * @param {LimitChunkCountPluginOptions=} options options object
	 */
	constructor(options = {}) {
		validateOptions(schema, options, "Limit Chunk Count Plugin");
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap("LimitChunkCountPlugin", compilation => {
			compilation.hooks.optimizeChunks.tap(
				/** @type {TODO} */ ({
					name: "LimitChunkCountPlugin",
					stage: STAGE_ADVANCED
				}),
				chunks => {
					const chunkGraph = compilation.chunkGraph;
					const maxChunks = options.maxChunks;
					if (!maxChunks) return;
					if (maxChunks < 1) return;
					if (compilation.chunks.size <= maxChunks) return;

					const compareChunksWithGraph = compareChunks(chunkGraph);
					const orderedChunks = Array.from(chunks).sort(compareChunksWithGraph);

					const sortedExtendedPairCombinations = orderedChunks
						.reduce((/** @type {[Chunk, Chunk][]} */ combinations, a, idx) => {
							// create combination pairs
							for (const b of orderedChunks) {
								if (b === a) break;
								// filter pairs that can NOT be integrated!
								if (chunkGraph.canChunksBeIntegrated(b, a)) {
									combinations.push([b, a]);
								}
							}
							return combinations;
						}, [])
						.map(pair => {
							// extend combination pairs with size and integrated size
							const a = chunkGraph.getChunkSize(pair[0], options);
							const b = chunkGraph.getChunkSize(pair[1], options);
							const ab = chunkGraph.getIntegratedChunksSize(
								pair[0],
								pair[1],
								options
							);
							/** @type {[number, number, Chunk, Chunk, number, number]} */
							const extendedPair = [a + b - ab, ab, pair[0], pair[1], a, b];
							return extendedPair;
						})
						.sort((a, b) => {
							// sadly javascript does an inplace sort here
							// sort them by size
							const diff1 = b[0] - a[0];
							if (diff1 !== 0) return diff1;
							const diff2 = a[1] - b[1];
							if (diff2 !== 0) return diff2;
							const diff3 = compareChunksWithGraph(a[2], b[2]);
							if (diff3 !== 0) return diff3;
							return compareChunksWithGraph(a[3], b[3]);
						});

					const pair = sortedExtendedPairCombinations[0];

					if (pair) {
						chunkGraph.integrateChunks(pair[2], pair[3]);
						compilation.chunks.delete(pair[3]);
						return true;
					}
				}
			);
		});
	}
}
module.exports = LimitChunkCountPlugin;
