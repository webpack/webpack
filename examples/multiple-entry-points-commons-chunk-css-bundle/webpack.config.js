var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: {
		A: "./a",
		B: "./b",
		C: "./c",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract({
					notExtractLoader: "style-loader",
					loader: "css-loader"
				})
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "commons",
			filename: "commons.js",
			chunks: ["A", "B"]
		}),
		new ExtractTextPlugin({
			filename: "[name].css"
		}),
	]
};
