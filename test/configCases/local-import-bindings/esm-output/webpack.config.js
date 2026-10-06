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
	mode: "development",
	devtool: false,
	// An external binds through the import statement itself, which webpack must
	// leave alone: it never parsed the module the export comes from.
	externals: { "external-module": "module external-module" },
	externalsType: "module",
	output: {
		filename: "bundle0.mjs",
		library: { type: "module" },
		module: true
	},
	module: {
		parser: {
			javascript: {
				localImportBindings: true
			}
		}
	},
	optimization: {
		concatenateModules: false
	},
	plugins: [snapshotBundle],
	experiments: { outputModule: true }
};
