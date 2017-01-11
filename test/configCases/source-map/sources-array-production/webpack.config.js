var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true
		})
	]
};
