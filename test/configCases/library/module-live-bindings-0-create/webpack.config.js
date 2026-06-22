"use strict";

/**
 * @param {string} assetName emitted entry asset to assert on
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertLiveBindings = (assetName) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source();
				// The entry's own exports must be live bindings to its top-level
				// declarations, not snapshots of `__webpack_exports__`.
				expect(source).not.toMatch(/const __webpack_exports__\w+ =/);
				expect(source).toMatch(/export \{[^}]*\bcount\b/);
			});
		});
	};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: "./lib.js",
		target: "node14",
		output: {
			filename: "lib.js",
			module: true,
			library: { type: "module" }
		},
		optimization: { concatenateModules: true },
		experiments: { outputModule: true },
		plugins: [assertLiveBindings("lib.js")]
	},
	{
		entry: "./lib.js",
		target: "node14",
		output: {
			filename: "runtime-chunk/[name].mjs",
			module: true,
			library: { type: "module" }
		},
		optimization: { concatenateModules: true, runtimeChunk: "single" },
		experiments: { outputModule: true },
		plugins: [assertLiveBindings("runtime-chunk/main.mjs")]
	}
];
