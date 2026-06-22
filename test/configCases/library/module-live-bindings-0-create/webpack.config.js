"use strict";

/**
 * Asserts the emitted entry keeps live ESM bindings (direct top-level
 * declarations) instead of snapshotting them through `__webpack_exports__`.
 * @param {string} assetName emitted entry asset to assert on
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertLiveBindings = (assetName) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source();
				expect(source).not.toMatch(/const __webpack_exports__\w+ =/);
				expect(source).toMatch(/export \{[^}]*\bmutLet\b/);
			});
		});
	};

/**
 * @param {string} name output sub-directory
 * @param {string} entryAsset emitted entry asset to assert on
 * @param {"development" | "production"} mode mode
 * @param {false | "single"} runtimeChunk runtime chunk option
 * @returns {import("../../../../").Configuration} config
 */
const variant = (name, entryAsset, mode, runtimeChunk) => ({
	mode,
	devtool: false,
	entry: { [entryAsset.replace(/\..*$/, "")]: "./lib.js" },
	target: "node14",
	output: {
		filename: `${name}/[name].mjs`,
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules: true, runtimeChunk, minimize: false },
	experiments: { outputModule: true },
	plugins: [assertLiveBindings(`${name}/${entryAsset}`)]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("single", "lib.mjs", "development", false),
	variant("single-prod", "lib.mjs", "production", false),
	variant("runtime", "main.mjs", "development", "single"),
	variant("runtime-prod", "main.mjs", "production", "single")
];
