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
