"use strict";

/**
 * @param {string} assetName emitted asset to assert on
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertHasDefaultExport = (assetName) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source();
				expect(source).toMatch(/\bexport\b/);
			});
		});
	};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./lib.js",
	target: "node14",
	output: {
		filename: "lib.mjs",
		module: true,
		library: { type: "module" }
	},
	optimization: {
		minimize: false,
		usedExports: true
	},
	experiments: { outputModule: true },
	plugins: [assertHasDefaultExport("lib.mjs")]
};
