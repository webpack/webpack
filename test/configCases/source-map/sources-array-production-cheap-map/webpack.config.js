var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "[file].map",
			cheap: true
		}),
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true
		})
	]
};
