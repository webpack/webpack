const path = require("path");
const LoaderOptionsPlugin = require("../../lib/LoaderOptionsPlugin");
const CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	mode: "production",
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
		rules: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
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
		// Temporary workaround for the file-loader
		new LoaderOptionsPlugin({
			options: {}
		})
	]
};
