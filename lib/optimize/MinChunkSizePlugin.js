/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/MinChunkSizePlugin.json");
const { STAGE_ADVANCED } = require("../OptimizationStages");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

class MinChunkSizePlugin {
	constructor(options) {
		validateOptions(schema, options, "Min Chunk Size Plugin");
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		const minChunkSize = options.minChunkSize;
		compiler.hooks.compilation.tap("MinChunkSizePlugin", compilation => {
			compilation.hooks.optimizeChunks.tap(
				/** @type {TODO} */ ({
					name: "MinChunkSizePlugin",
					stage: STAGE_ADVANCED
				}),
				chunks => {
					const chunkGraph = compilation.chunkGraph;
					const equalOptions = {
						chunkOverhead: 1,
						entryChunkMultiplicator: 1
					};

					const sortedSizeFilteredExtendedPairCombinations = chunks
						.reduce((/** @type {[Chunk, Chunk][]} */ combinations, a, idx) => {
							// create combination pairs
							for (let i = 0; i < idx; i++) {
								const b = chunks[i];
								combinations.push([b, a]);
							}
							return combinations;
						}, [])
						.filter(pair => {
							// check if one of the chunks sizes is smaller than the minChunkSize
							const p0SmallerThanMinChunkSize =
								chunkGraph.getChunkSize(pair[0], equalOptions) < minChunkSize;
							const p1SmallerThanMinChunkSize =
								chunkGraph.getChunkSize(pair[1], equalOptions) < minChunkSize;
							if (!p0SmallerThanMinChunkSize && !p1SmallerThanMinChunkSize)
								return false;
							// filter pairs that can NOT be integrated!
							return chunkGraph.canChunksBeIntegrated(pair[0], pair[1]);
						})
						.map(pair => {
							// extend combination pairs with size and integrated size
							const a = chunkGraph.getChunkSize(pair[0], options);
							const b = chunkGraph.getChunkSize(pair[1], options);
							const ab = chunkGraph.getIntegratedChunksSize(
								pair[0],
								pair[1],
								options
							);
							/** @type {[number, number, Chunk, Chunk]} */
							const extendedPair = [a + b - ab, ab, pair[0], pair[1]];
							return extendedPair;
						})
						.sort((a, b) => {
							// sadly javascript does an inplace sort here
							// sort by size
							const diff = b[0] - a[0];
							if (diff !== 0) return diff;
							return a[1] - b[1];
						});

					if (sortedSizeFilteredExtendedPairCombinations.length === 0) return;

					const pair = sortedSizeFilteredExtendedPairCombinations[0];

					chunkGraph.integrateChunks(pair[2], pair[3]);
					chunks.splice(chunks.indexOf(pair[3]), 1);
					return true;
				}
			);
		});
	}
}
module.exports = MinChunkSizePlugin;
