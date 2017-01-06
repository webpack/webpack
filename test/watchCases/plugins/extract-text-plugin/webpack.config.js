var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	module: {
		loaders: [
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract({
					loader: "css-loader"
				})
			}
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: "[name].css"
		})
	]
};
