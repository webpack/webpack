const TerserPlugin = require("terser-webpack-plugin");
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
				cache: false,
				parallel: false,
				exclude: ["vendors.js", "extract.js"]
			}),
			new TerserPlugin({
				cache: false,
				parallel: false,
				extractComments: true,
				include: ["extract.js"]
			}),
			new TerserPlugin({
				cache: false,
				parallel: false,
				terserOptions: {
					compress: {
						passes: 2
					}
				},
				include: ["compress.js"]
			})
		]
	}
};
