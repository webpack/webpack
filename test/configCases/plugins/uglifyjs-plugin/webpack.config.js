var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"],
		ie8: ["./ie8.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			comments: false,
			exclude: ["vendors.js"],
			mangle: {
				screw_ie8: false
			}
		})
	]
};
