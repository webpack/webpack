var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"],
		ie8: ["./ie8.js"],
		extract: ["./extract.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			comments: false,
			exclude: ["vendors.js", "extract.js"],
			mangle: {
				screw_ie8: false
			}
		}),
		new webpack.optimize.UglifyJsPlugin({
			extractComments: true,
			include: ["extract.js"],
			mangle: {
				screw_ie8: false
			}
		}),
	]
};
