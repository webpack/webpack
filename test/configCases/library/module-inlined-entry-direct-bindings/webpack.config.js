"use strict";

/**
 * Regression guard for the inlined module-library entry: its top-level
 * declarations must be exported as live ESM bindings, not snapshotted through
 * `__webpack_exports__`. Covers both lookup sources for `topLevelDeclarations`:
 * concatenated entries read it from the code generation data, non-concatenated
 * ones from `module.buildInfo` (the guarded fallback, where `data` is undefined).
 * @param {string} assetName emitted entry asset to assert on
 * @param {string} binding exported binding expected to stay live
 * @returns {(this: import("../../../../").Compiler) => void} plugin
 */
const assertLiveBindings = (assetName, binding) =>
	function apply() {
		this.hooks.compilation.tap("testcase", (compilation) => {
			compilation.hooks.afterProcessAssets.tap("testcase", (assets) => {
				const source = assets[assetName].source();
				expect(source).not.toMatch(/const __webpack_exports__\w+ =/);
				expect(source).toMatch(new RegExp(`export \\{[^}]*\\b${binding}\\b`));
			});
		});
	};

/**
 * @param {string} name output sub-directory and asset base name
 * @param {string} entry entry module
 * @param {string} binding exported binding to assert on
 * @param {boolean} concatenateModules concatenation flag
 * @returns {import("../../../../").Configuration} config
 */
const variant = (name, entry, binding, concatenateModules) => ({
	mode: "development",
	devtool: false,
	entry,
	target: "node14",
	output: {
		filename: `${name}.mjs`,
		module: true,
		library: { type: "module" }
	},
	optimization: { concatenateModules, minimize: false },
	experiments: { outputModule: true },
	plugins: [assertLiveBindings(`${name}.mjs`, binding)]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Concatenated entry: `topLevelDeclarations` comes from code generation data.
	variant("concat", "./lib.js", "value", true),
	// Non-concatenated single entry: `data` is undefined, so
	// `topLevelDeclarations` comes from `module.buildInfo`.
	variant("standalone", "./lib-standalone.js", "count", false)
];
