const TerserPlugin = require("terser-webpack-plugin");
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				sourceMap: true,
				terserOptions: {
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
				warningsFilter(message, filename) {
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
