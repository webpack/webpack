"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "none",
	entry: { main: "./index.js", test: "./test" },
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].js",
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: [".js"]
	},
	externalsType: "module",
	externals: ["external0"],
	optimization: {
		concatenateModules: true
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 */
			const handler = (compilation) => {
				compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
					const source = assets["test.js"].source();
					expect(source).toContain("export const value");
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
