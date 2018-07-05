var path = require("path");
var webpack = require("../../../../");

module.exports = {
	entry: ["./a", "./b", "./_d", "./_e", "./f", "./g.abc"],
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
			}
		]
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/dll-plugin/manifest0.json"
			)
		})
	]
};
