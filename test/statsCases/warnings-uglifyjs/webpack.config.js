const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		minimize: true,
		minimizer: [
			new UglifyJsPlugin({
				sourceMap: true,
				uglifyOptions: {
					compress: {
						warnings: true
					},
					mangle: false,
					output: {
						beautify: true,
						comments: false
					},
					warnings: true
				},
				warningsFilter(filename) {
					return /a\.js$/.test(filename);
				}
			})
		]
	},
	stats: {
		chunkModules: false,
		modules: true,
		providedExports: true,
		usedExports: true
	}
};
