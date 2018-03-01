var webpack = require("../../../../");
var path = require("path");
module.exports = [
	{
		resolve: {
			alias: {
				library: path.resolve(
					__dirname,
					"../../../js/config/library/0-create-library/commonjs.js"
				)
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
				library: path.resolve(
					__dirname,
					"../../../js/config/library/0-create-library/umd.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("umd")
			})
		]
	},
	{
		entry: "./global-test.js",
		resolve: {
			alias: {
				library: path.resolve(
					__dirname,
					"../../../js/config/library/0-create-library/this.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("this")
			})
		]
	},
	{
		resolve: {
			alias: {
				library: path.resolve(
					__dirname,
					"../../../js/config/library/0-create-library/commonjs2-external.js"
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
		entry: "./default-test.js",
		resolve: {
			alias: {
				library: path.resolve(
					__dirname,
					"../../../js/config/library/0-create-library/umd-default.js"
				)
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				NAME: JSON.stringify("default")
			})
		]
	}
];
