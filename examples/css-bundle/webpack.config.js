var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	module: {
		loaders: [
			{
				test: /\.css$/,
				loaders: [
					ExtractTextPlugin.loader({ remove: true }),
					"css-loader"
				]
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new ExtractTextPlugin("style.css", { allChunks: true })
	]
};