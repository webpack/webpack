const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		ie8: ["./ie8.js"],
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"],
		extract: ["./extract.js"],
		compress: ["./compress.js"]
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: true,
		minimizer: [
			new UglifyJsPlugin({
				exclude: ["vendors.js", "extract.js"]
			}),
			new UglifyJsPlugin({
				extractComments: true,
				include: ["extract.js"]
			}),
			new UglifyJsPlugin({
				uglifyOptions: {
					compress: {
						passes: 2
					}
				},
				include: ["compress.js"]
			})
		]
	}
};
