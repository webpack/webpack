"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"FailOptimizeChunkModules",
					(compilation) => {
						compilation.hooks.optimizeChunkModules.tapAsync(
							"FailOptimizeChunkModules",
							(chunks, modules, callback) => {
								callback(new Error("failed in optimizeChunkModules"));
							}
						);
					}
				);
			}
		}
	]
};
