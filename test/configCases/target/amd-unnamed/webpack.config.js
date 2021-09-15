const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "amd"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner: "function define(deps, fn) { fn(); }\n"
		})
	]
};
