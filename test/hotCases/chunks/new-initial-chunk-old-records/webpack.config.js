"use strict";

// Records written before chunkSiblingIds existed still find a new initial chunk.
class DropChunkSiblingIdsPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DropChunkSiblingIdsPlugin",
			(compilation) => {
				compilation.hooks.record.tap(
					{ name: "DropChunkSiblingIdsPlugin", stage: 100 },
					(compilation, records) => {
						delete records.chunkSiblingIds;
					}
				);
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new DropChunkSiblingIdsPlugin()],
	output: { filename: "[name].js" },
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				dep: { test: /dep/, name: "dep", chunks: "initial", enforce: true }
			}
		}
	}
};
