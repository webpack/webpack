"use strict";

/** @type {(compiler: import("../../../../types").Compiler) => void} */
const snapshotBundle = (compiler) => {
	compiler.hooks.compilation.tap(
		"test",
		(/** @type {import("../../../../types").Compilation} */ compilation) => {
			compilation.hooks.afterProcessAssets.tap(
				"test",
				(
					/** @type {Record<string, import("webpack-sources").Source>} */ assets
				) => {
					expect(assets["bundle0.mjs"].source()).toMatchSnapshot();
				}
			);
		}
	);
};

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	// The annotation is only written into output another build reads back;
	// a CommonJS module earns it from its own source, with no `sideEffects` rule.
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	plugins: [snapshotBundle],
	experiments: { outputModule: true }
};
