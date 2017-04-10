var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	output: {
		sourceMapFilename: "[file].map?[hash]",
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true
		})
	]
};
