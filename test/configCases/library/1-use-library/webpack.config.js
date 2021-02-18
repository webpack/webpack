var webpack = require("../../../../");
var path = require("path");
/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
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
				external: path.resolve(__dirname, "node_modules/external.js")
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
				external: path.resolve(__dirname, "node_modules/external.js")
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
				external: path.resolve(__dirname, "node_modules/external.js")
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
				external: path.resolve(__dirname, "node_modules/external.js")
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
					"../0-create-library/commonjs2-split-chunks/"
				),
				external: path.resolve(__dirname, "node_modules/external.js")
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
