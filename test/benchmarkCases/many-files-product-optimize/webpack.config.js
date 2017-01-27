var webpack = require("../../../");

module.exports = {
	entry: "./index",
	plugins: [
		new webpack.optimize.UglifyJsPlugin(),
		new webpack.DefinePlugin({
			"process.env.manyFiles": JSON.stringify("test")
		})
	]
}
