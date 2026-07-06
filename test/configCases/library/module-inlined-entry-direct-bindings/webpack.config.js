"use strict";

/**
 * Regression guard for the inlined module-library entry: its top-level
 * declarations (looked up from the code generation results) must be exported
 * as live ESM bindings, not snapshotted through `__webpack_exports__`.
 * @param {string} assetName emitted entry asset to assert on
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertLiveBindings = (assetName) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source();
				expect(source).not.toMatch(/const __webpack_exports__\w+ =/);
				expect(source).toMatch(/export \{[^}]*\bvalue\b/);
			});
		});
	};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: "./lib.js",
	target: "node14",
	output: {
		filename: "lib.mjs",
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules: true, minimize: false },
	experiments: { outputModule: true },
	plugins: [assertLiveBindings("lib.mjs")]
};
