const TerserPlugin = require("terser-webpack-plugin");
const baseConfig = {
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
				}
			})
		]
	},
	stats: {
		chunkModules: false,
		modules: false,
		providedExports: false,
		usedExports: false
	}
};

module.exports = [
	undefined,
	"Terser",
	/Terser/,
	warnings => true,
	["Terser"],
	[/Terser/],
	[warnings => true],
	"should not filter",
	/should not filter/,
	warnings => false,
	["should not filter"],
	[/should not filter/],
	[warnings => false]
].map(filter =>
	Object.assign({}, baseConfig, {
		name: Array.isArray(filter) ? `[${filter}]` : `${filter}`,
		stats: Object.assign({}, baseConfig.stats, {
			warningsFilter: filter
		})
	})
);
