var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.LoaderOptionsPlugin({
			minimize: true
		}),
		new webpack.LoaderOptionsPlugin({
			test: /\.js$/,
			jsfile: true
		})
	]
};
