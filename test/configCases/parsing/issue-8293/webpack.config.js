const webpack = require("../../../../");

module.exports = {
	entry: {
		bundle0: "./index.js",
		bundle1: "./other.js"
	},
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false
	},
	plugins: [
		new webpack.DefinePlugin({
			NAME: "foobar"
		})
	]
};
