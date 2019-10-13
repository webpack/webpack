const webpack = require("../../../../");

module.exports = [
	{
		output: {
			libraryTarget: "amd"
		},
		externals: {
			external: "external"
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "function define(deps, fn) { fn(); }\n"
			})
		]
	},
	{
		output: {
			libraryTarget: "amd-require"
		},
		externals: {
			external: "external"
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "function require(deps, fn) { fn(); }\n"
			})
		]
	}
];
