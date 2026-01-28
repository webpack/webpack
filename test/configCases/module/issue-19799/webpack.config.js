"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		output: {
			filename: "lib.mjs",
			module: true,
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		},
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.compilation.tap("MyPlugin", (compilation) => {
						const hooks =
							webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
								compilation
							);
						hooks.inlineInRuntimeBailout.tap("test", () => "test bailout");
					});
				}
			}
		]
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.mjs",
			module: true
		},
		experiments: { outputModule: true },
		externals: {
			lib: path.resolve(testPath, "./lib.mjs")
		},
		externalsType: "module-import"
	}
];
