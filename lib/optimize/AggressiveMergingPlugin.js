/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_ADVANCED } = require("../OptimizationStages");

/** @import Chunk from "../Chunk" */
/** @import Compiler from "../Compiler" */

/**
 * Defines the aggressive merging plugin options type used by this module.
 * @typedef {object} AggressiveMergingPluginOptions
 * @property {number=} minSizeReduce minimal size reduction to trigger merging
 */

const PLUGIN_NAME = "AggressiveMergingPlugin";

class AggressiveMergingPlugin {
	/**
	 * Creates an instance of AggressiveMergingPlugin.
	 * @param {AggressiveMergingPluginOptions=} options options object
	 */
	constructor(options) {
		if (
			(options !== undefined && typeof options !== "object") ||
			Array.isArray(options)
		) {
			throw new Error(
				"Argument should be an options object. To use defaults, pass in nothing.\nFor more info on options, see https://webpack.js.org/plugins/"
			);
		}
		/** @type {AggressiveMergingPluginOptions} */
		this.options = options || {};
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		const minSizeReduce = options.minSizeReduce || 1.5;

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.optimizeChunks.tap(
				{
					name: PLUGIN_NAME,
					stage: STAGE_ADVANCED
				},
				(chunks) => {
					const chunkGraph = compilation.chunkGraph;
					// Only the single best pair is merged per pass (the hook re-runs
					// after each merge), so track the max directly instead of building
					// and sorting the full O(chunks²) list of pairs every pass. A strict
					// `>` keeps the first-encountered best, matching the previous stable
					// descending sort's `[0]`.
					/** @type {Chunk | undefined} */
					let bestA;
					/** @type {Chunk | undefined} */
					let bestB;
					let bestImprovement = -Infinity;
					for (const a of chunks) {
						if (a.canBeInitial()) continue;
						for (const b of chunks) {
							if (b.canBeInitial()) continue;
							if (b === a) break;
							if (!chunkGraph.canChunksBeIntegrated(a, b)) {
								continue;
							}
							const aSize = chunkGraph.getChunkSize(b, {
								chunkOverhead: 0
							});
							const bSize = chunkGraph.getChunkSize(a, {
								chunkOverhead: 0
							});
							const abSize = chunkGraph.getIntegratedChunksSize(b, a, {
								chunkOverhead: 0
							});
							const improvement = (aSize + bSize) / abSize;
							if (improvement > bestImprovement) {
								bestImprovement = improvement;
								bestA = a;
								bestB = b;
							}
						}
					}

					if (bestA === undefined) return;
					if (bestImprovement < minSizeReduce) return;

					chunkGraph.integrateChunks(/** @type {Chunk} */ (bestB), bestA);
					compilation.chunks.delete(bestA);
					return true;
				}
			);
		});
	}
}

module.exports = AggressiveMergingPlugin;
