"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "none",
	devtool: false,
	entry: "./index.js",
	target: ["web", "es2020"],
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "bundle0.mjs",
		chunkFilename: "dynamic.mjs"
	},
	externalsType: "module-import",
	externals: {
		"external-lib": "external-lib"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(
					"module-import-hoist-async-chunk-check",
					(compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: "module-import-hoist-async-chunk-check",
								stage:
									compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
							},
							() => {
								const mainAsset = compilation.getAsset("bundle0.mjs");
								const dynamicAsset = compilation.getAsset("dynamic.mjs");
								if (!mainAsset || !dynamicAsset) {
									compilation.errors.push(
										new Error(
											"Expected emitted assets bundle0.mjs and dynamic.mjs to exist"
										)
									);
									return;
								}

								const externalImportRegex = /from\s+["']external-lib["']/;
								const mainSource = mainAsset.source.source().toString();
								const dynamicSource = dynamicAsset.source.source().toString();

								if (externalImportRegex.test(mainSource)) {
									compilation.errors.push(
										new Error(
											'Unexpected hoist: bundle0.mjs contains `from "external-lib"`'
										)
									);
								}
								if (!externalImportRegex.test(dynamicSource)) {
									compilation.errors.push(
										new Error(
											'Missing hoist: dynamic.mjs does not contain `from "external-lib"`'
										)
									);
								}
							}
						);
					}
				);
			}
		}
	]
};
