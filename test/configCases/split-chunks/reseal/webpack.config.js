"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: {
		main: "./index.js",
		other: "./other.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: false,
		splitChunks: {
			chunks: "all",
			minSize: 0
		}
	},
	plugins: [
		/**
		 * Requests another seal after chunk splitting and runtime generation.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap("test", (compilation) => {
				let seals = 0;
				compilation.hooks.needAdditionalSeal.tap("test", () => ++seals < 2);
				compilation.hooks.afterSeal.tap("test", () => {
					expect(seals).toBe(2);
					for (const module of compilation.modules) {
						for (const chunk of compilation.chunkGraph.getModuleChunksIterable(
							module
						)) {
							expect(compilation.chunks.has(chunk)).toBe(true);
						}
					}
				});
			});
		}
	]
};
