var path = require("path");
var webpack = require("../../../../lib/webpack");

module.exports = {
	entry: path.resolve(__dirname, "./index"),
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			foo: "bar"
		})
	]
};
