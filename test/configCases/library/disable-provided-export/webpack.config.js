"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: "./module.js",
		optimization: {
			providedExports: false
		},
		output: {
			library: {
				type: "module"
			}
		},
		experiments: {
			outputModule: true
		},
		externals: ["react"],
		externalsType: "module"
	},
	{
		entry: "./modern-module.js",
		optimization: {
			providedExports: false
		},
		output: {
			library: {
				type: "modern-module",
				export: ["lib2"]
			}
		},
		experiments: {
			outputModule: true
		}
	},
	{
		entry: "./commonjs-static.js",
		optimization: {
			providedExports: false
		},
		output: {
			library: {
				type: "commonjs-static"
			}
		}
	},
	{
		entry: "./run.js",
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: `
					import lib1Default, { foo, React } from './bundle0.mjs';
					import { lib2 } from './bundle1.mjs';

					import { createRequire } from 'module';
					const require = createRequire(import.meta.url);

					const { lib3 } = require("./bundle2.js");

					let libModule = { default: lib1Default, foo, React };
					let libModernModule = { default: lib2};
					let libCommonjsStatic = { default: lib3 };
					`
			}),
			{
				apply(compiler) {
					compiler.hooks.done.tap(
						{
							name: "disable-provided-export",
							stage: 100
						},
						() => {
							expect(
								compiler.hooks.compilation.taps.filter(
									(tap) => tap.name === "FlagDependencyExportsPlugin"
								)
							).toHaveLength(1);
						}
					);
				}
			}
		],
		output: {
			enabledLibraryTypes: ["module", "modern-module"],
			library: {
				type: "module"
			}
		},
		optimization: {
			providedExports: false
		},
		experiments: {
			outputModule: true
		}
	}
];
