"use strict";

const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

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
		new UglifyJSPlugin({
			comments: false,
			exclude: ["vendors.js", "extract.js"],
			mangle: {
				screw_ie8: false
			}
		}),
		new UglifyJSPlugin({
			extractComments: true,
			include: ["extract.js"],
			mangle: {
				screw_ie8: false
			}
		}),
		new UglifyJSPlugin({
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
