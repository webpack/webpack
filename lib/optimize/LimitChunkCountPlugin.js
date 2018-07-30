/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/LimitChunkCountPlugin.json");
const { STAGE_ADVANCED } = require("../OptimizationStages");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

class LimitChunkCountPlugin {
	constructor(options) {
		validateOptions(schema, options || {}, "Limit Chunk Count Plugin");
		this.options = options || {};
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
					if (chunks.length <= maxChunks) return;

					const sortedExtendedPairCombinations = chunks
						.reduce((/** @type {[Chunk, Chunk][]} */ combinations, a, idx) => {
							// create combination pairs
							for (let i = 0; i < idx; i++) {
								const b = chunks[i];
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
							const diff = b[0] - a[0];
							if (diff !== 0) return diff;
							return a[1] - b[1];
						});

					const pair = sortedExtendedPairCombinations[0];

					if (pair) {
						chunkGraph.integrateChunks(pair[2], pair[3]);
						chunks.splice(chunks.indexOf(pair[3]), 1);
						return true;
					}
				}
			);
		});
	}
}
module.exports = LimitChunkCountPlugin;
