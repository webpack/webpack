"use strict";

/** @import { Compiler, Compilation, Configuration } from "../../../../types.d.ts" */
/** @import { Source } from "webpack-sources" */

/** @type {(compiler: Compiler) => void} */
const snapshotBundle = (compiler) => {
	compiler.hooks.compilation.tap(
		"test",
		(/** @type {Compilation} */ compilation) => {
			compilation.hooks.afterProcessAssets.tap(
				"test",
				(/** @type {Record<string, Source>} */ assets) => {
					expect(assets["bundle0.mjs"].source()).toMatchSnapshot();
				}
			);
		}
	);
};

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	// The annotation is only written into output another build reads back.
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	optimization: {
		concatenateModules: false
	},
	plugins: [snapshotBundle],
	experiments: { outputModule: true }
};
