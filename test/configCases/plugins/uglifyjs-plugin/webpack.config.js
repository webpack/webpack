const webpack = require("../../../../");

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
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			exclude: [
				"vendors.js",
				"extract.js"
			]
		}),
		new webpack.optimize.UglifyJsPlugin({
			extractComments: true,
			include: [
				"extract.js"
			]
		}),
		new webpack.optimize.UglifyJsPlugin({
			uglifyOptions: {
				compress: {
					passes: 2
				}
			},
			include: [
				"compress.js"
			]
		})
	]
};
