"use strict";

const { WebpackError } = require("../../../../");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		library: { type: "module" }
	},
	optimization: {
		minimize: false
	},
	plugins: [
		/**
		 * Fails the build when a module reports its live exports as copies.
		 * @this {import("../../../../").Compiler} the compiler
		 */
		function noCopyBailouts() {
			this.hooks.compilation.tap("test", (compilation) => {
				compilation.hooks.afterSeal.tap("test", () => {
					for (const module of compilation.modules) {
						for (const reason of compilation.moduleGraph.getOptimizationBailout(
							module
						)) {
							if (typeof reason === "string" && reason.includes("copies")) {
								compilation.errors.push(
									new WebpackError(`${module.identifier()}: ${reason}`)
								);
							}
						}
					}
				});
			});
		}
	]
};
