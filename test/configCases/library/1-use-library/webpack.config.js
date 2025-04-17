/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */

const webpack = require("../../../../");
const path = require("path");
const supportsAsync = require("../../../helpers/supportsAsync");

/** @typedef {import("../../../WatchTestCases.template").Env} Env */
/** @typedef {import("../../../WatchTestCases.template").TestOptions} TestOptions */

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		entry: "./default-test-modern-module.js",
		optimization: {
			minimize: true
		},
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/modern-module.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("modern-module-tree-shakable")
			}),
			/**
			 * @this {Compiler} compiler
			 */
			function () {
				/**
				 * @param {Compilation} compilation compilation
				 * @returns {void}
				 */
				const handler = compilation => {
					compilation.hooks.afterProcessAssets.tap("testcase", assets => {
						for (const asset of Object.keys(assets)) {
							const source = assets[asset].source();
							expect(source).not.toContain('"a"');
							expect(source).not.toContain('"b"');
							expect(source).not.toContain('"non-external"');
							// expect pure ESM export without webpack runtime
							expect(source).not.toContain('"__webpack_exports__"');
							expect(source).not.toContain(".exports=");
						}
					});
				};
				this.hooks.compilation.tap("testcase", handler);
			}
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/esm.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm")
			})
		]
	},
	{
		entry: "./esm-with-commonjs",
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-with-commonjs.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-with-commonjs")
			})
		]
	},
	{
		entry: "./module-export-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/esm-export.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-export")
			})
		]
	},
	{
		entry: "./module-export-test.js",
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-export-no-concatenate-modules.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-export-no-concatenate-modules.js")
			})
		]
	},
	...(supportsAsync()
		? [
				{
					resolve: {
						alias: {
							library: path.resolve(
								testPath,
								"../0-create-library/esm-async.js"
							)
						}
					},
					plugins: [
						new webpack.DefinePlugin({
							NAME: JSON.stringify("esm-async")
						})
					]
				},
				{
					resolve: {
						alias: {
							library: path.resolve(
								testPath,
								"../0-create-library/esm-async-no-concatenate-modules.js"
							)
						}
					},
					plugins: [
						new webpack.DefinePlugin({
							NAME: JSON.stringify("esm-async-no-concatenate-modules")
						})
					]
				}
			]
		: []),
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-runtimeChunk/main.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-runtimeChunk")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-runtimeChunk-concatenateModules/main.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-runtimeChunk-concatenateModules")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-runtimeChunk-no-concatenateModules/main.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-runtimeChunk-no-concatenateModules")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/esm-runtimeChunk-concatenateModules-splitChunks/main.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("esm-runtimeChunk-concatenateModules-splitChunks")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/commonjs.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/commonjs-iife.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs-iife")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/amd.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("amd")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/amd-iife.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("amd-iife")
			})
		]
	},
	{
		externals: {
			library: `promise (require(${JSON.stringify(
				"../0-create-library/amd-runtimeChunk/runtime.js"
			)}), require(${JSON.stringify(
				"../0-create-library/amd-runtimeChunk/main.js"
			)}))`
		},
		output: {
			library: { type: "commonjs-module" }
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("amd-runtimeChunk")
			})
		]
	},
	{
		externals: {
			library: `promise (require(${JSON.stringify(
				"../0-create-library/amd-iife-runtimeChunk/runtime.js"
			)}), require(${JSON.stringify(
				"../0-create-library/amd-iife-runtimeChunk/main.js"
			)}))`
		},
		output: {
			library: { type: "commonjs-module" }
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("amd-iife-runtimeChunk")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/umd.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("umd")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/true-iife-umd.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("true-iife-umd")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/false-iife-umd.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("false-iife-umd")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/false-iife-umd2.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("false-iife-umd2")
			})
		]
	},
	{
		entry: "./this-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/this.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("this")
			})
		]
	},
	{
		entry: "./this-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/this-iife.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("this-iife")
			})
		]
	},
	{
		entry: "./var-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/var.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("var")
			})
		]
	},
	{
		entry: "./var-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/var-iife.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("var-iife")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs-nested.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs-nested")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs-nested-iife.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs-nested-iife")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs2-external.js"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2 with external"),
				TEST_EXTERNAL: true
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs2-iife-external.js"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2-iife with external"),
				TEST_EXTERNAL: true
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs2-external-eval.js"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2 with external and eval devtool"),
				TEST_EXTERNAL: true
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs2-external-eval-source-map.js"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify(
					"commonjs2 with external and eval-source-map devtool"
				),
				TEST_EXTERNAL: true
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs-static-external.js"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs-static with external"),
				TEST_EXTERNAL: true
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					testPath,
					"../0-create-library/commonjs2-split-chunks/"
				),
				external: path.resolve(__dirname, "node_modules/external.js"),
				"external-named": path.resolve(
					__dirname,
					"node_modules/external-named.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2 with splitChunks")
			})
		]
	},
	{
		entry: "./default-test.js",
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/umd-default.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("default")
			})
		]
	},
	{
		externals: {
			library: `promise require(${JSON.stringify(
				path.resolve(
					testPath,
					"../0-create-library/commonjs2-runtimeChunk/main.js"
				)
			)})`
		},
		output: {
			library: { type: "commonjs-module" }
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2-runtimeChunk")
			})
		]
	},
	{
		externals: {
			library: `promise require(${JSON.stringify(
				path.resolve(
					testPath,
					"../0-create-library/commonjs2-iife-runtimeChunk/main.js"
				)
			)})`
		},
		output: {
			library: { type: "commonjs-module" }
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("commonjs2-iife-runtimeChunk")
			})
		]
	},
	{
		externals: {
			library: `var (require(${JSON.stringify(
				"../0-create-library/global-runtimeChunk/runtime.js"
			)}), require(${JSON.stringify(
				"../0-create-library/global-runtimeChunk/main.js"
			)}), globalName.x.y)`
		},
		target: "web",
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("global-runtimeChunk")
			})
		]
	},
	{
		externals: {
			library: `var (require(${JSON.stringify(
				"../0-create-library/global-iife-runtimeChunk/runtime.js"
			)}), require(${JSON.stringify(
				"../0-create-library/global-iife-runtimeChunk/main.js"
			)}), globalName.x.y)`
		},
		target: "web",
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("global-iife-runtimeChunk")
			})
		]
	},

	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/entryA.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("entryA")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/entryB.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("entryB")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(testPath, "../0-create-library/entryC.js")
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("entryC")
			})
		]
	}
];
