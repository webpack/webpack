"use strict";

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../types").Configuration} Configuration */

/**
 * @param {string} name emitted library bundle
 * @returns {(this: Compiler) => void} plugin asserting the namespace reexport
 */
const expectNamespaceReexport = (name) =>
	function apply() {
		/**
		 * @param {Compilation} compilation compilation
		 */
		const handler = (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				expect(assets[name].source()).toMatch(/ as ns[,\s}]/);
			});
		};
		this.hooks.compilation.tap("testcase", handler);
	};

/** @type {Configuration} */
const common = {
	mode: "production",
	output: {
		module: true,
		filename: "[name].js",
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	}
};

/** @type {Configuration[]} */
module.exports = [
	{
		...common,
		name: "concat",
		entry: { main: "./index.js", lib: "./lib.js" },
		optimization: { minimize: false, concatenateModules: true },
		plugins: [expectNamespaceReexport("lib.js")]
	},
	{
		...common,
		name: "no-concat",
		entry: {
			"main-no-concat": "./index.js",
			"lib-no-concat": "./lib.js"
		},
		optimization: { minimize: false, concatenateModules: false },
		plugins: [expectNamespaceReexport("lib-no-concat.js")]
	}
];
