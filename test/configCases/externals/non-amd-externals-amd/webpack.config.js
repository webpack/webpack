const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "amd"
	},
	externals: {
		external0: "external0",
		external1: "var 'abc'"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	target: "web",
	externalsPresets: {
		node: true
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"function define(deps, fn) { fn(...deps.map(dep => require(dep))); }\n"
		})
	]
};
