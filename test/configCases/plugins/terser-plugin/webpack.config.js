const TerserPlugin = require("terser-webpack-plugin");
/** @type {import("../../../../").Configuration} */
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
			new TerserPlugin({
				parallel: false,
				extractComments: false,
				exclude: ["vendors.js", "compress.js", "extract.js"]
			}),
			new TerserPlugin({
				parallel: false,
				include: ["extract.js"]
			}),
			new TerserPlugin({
				parallel: false,
				terserOptions: {
					compress: {
						passes: 2
					}
				},
				extractComments: false,
				include: ["compress.js"]
			})
		]
	}
};
