const webpack = require("../../../../");
const version = JSON.stringify(webpack.version);

module.exports = [
	{
		output: {
			libraryTarget: "amd"
		},
		externals: {
			external: { amd: "external-amd" }
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "function define(deps, fn) { fn(" + version + "); }\n"
			}),
			new webpack.DefinePlugin({ EXPECTED: version })
		]
	},
	{
		output: {
			libraryTarget: "amd-require"
		},
		externals: function(context, request, callback) {
			if (request === "external") {
				return callback(null, "external-amd", "amd");
			}
			callback();
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "var require = function(deps, fn) { fn(" + version + "); }\n"
			}),
			new webpack.DefinePlugin({ EXPECTED: version })
		]
	}
];
