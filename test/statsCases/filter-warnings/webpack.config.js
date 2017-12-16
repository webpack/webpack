const webpack = require("../../../");

const baseConfig = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true,
			uglifyOptions: {
				compress: {
					warnings: true,
				},
				mangle: false,
				output: {
					beautify: true,
					comments: false
				},
				warnings: true
			}
		})
	],
	stats: {
		chunkModules: false,
		modules: false,
		providedExports: false,
		usedExports: false,
	}
};

module.exports = [
	undefined,
	"UglifyJs",
	/UglifyJs/,
	warnings => true,
	["UglifyJs"],
	[/UglifyJs/],
	[
		warnings => true
	],
	"should not filter",
	/should not filter/,
	warnings => false,
	["should not filter"],
	[/should not filter/],
	[
		warnings => false
	]
].map(filter => Object.assign({}, baseConfig, {
	stats: Object.assign({}, baseConfig.stats, { warningsFilter: filter })
}));
