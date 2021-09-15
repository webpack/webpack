var path = require("path");
var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./a", "./b", "./_d", "./_e", "./f", "./g.abc", "./h"],
	resolve: {
		extensions: [".js", ".jsx"]
	},
	output: {
		filename: "dll.js",
		chunkFilename: "[id].dll.js",
		libraryTarget: "commonjs2"
	},
	module: {
		rules: [
			{
				test: /\.abc\.js$/,
				loader: "./g-loader.js",
				options: {
					test: 1
				}
			},
			{
				test: /0-create-dll.h/,
				sideEffects: false
			}
		]
	},
	optimization: {
		usedExports: true,
		sideEffects: true
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/dll-plugin/manifest0.json"
			),
			entryOnly: false
		})
	]
};
