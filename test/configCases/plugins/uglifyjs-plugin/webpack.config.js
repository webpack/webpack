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
		extract: ["./extract.js"],
		compress: ["./compress.js"]
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
		new webpack.optimize.UglifyJsPlugin({
			include: ["compress.js"],
			compress: {
				conditionals: true,
				evaluate: true,
				passes: 2,
				reduce_vars: true,
				unused: true
			}
		}),
	]
};
