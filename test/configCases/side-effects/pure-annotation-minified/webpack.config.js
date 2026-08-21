"use strict";

/** @type {(compiler: import("../../../../types").Compiler) => void} */
const expectAnnotation = (compiler) => {
	compiler.hooks.compilation.tap(
		"test",
		(/** @type {import("../../../../types").Compilation} */ compilation) => {
			compilation.hooks.afterProcessAssets.tap(
				"test",
				(
					/** @type {Record<string, import("webpack-sources").Source>} */ assets
				) => {
					// Terser strips annotations unless the library defaults ask it not to,
					// so the one in front of the side-effect-free module's instantiation
					// must still be here. Asserted on the asset rather than at runtime:
					// reading the bundle back would make it import `node:module`.
					expect(assets["bundle0.mjs"].source()).toMatch(
						/\/\*#__PURE__\*\/\w+\(/
					);
				}
			);
		}
	);
};

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	module: {
		rules: [{ test: /[\\/]pure-cjs\.js$/, sideEffects: false }]
	},
	optimization: {
		minimize: true,
		// `"..."` keeps webpack's own default minimizer, so the case runs the
		// terser options `defaults.js` picks for a library.
		minimizer: ["..."]
	},
	plugins: [expectAnnotation],
	experiments: { outputModule: true }
};
