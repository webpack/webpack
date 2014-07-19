var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: {
		A: "./a",
		B: "./b",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				loaders: [
					ExtractTextPlugin.loader({ remove: true, extract: false }),
					"style-loader",
					ExtractTextPlugin.loader({ remove: true }),
					"css-loader"
				]
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin("commons", "commons.js"),
		new ExtractTextPlugin("[name].css"),
	]
};