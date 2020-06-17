const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "amd"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner: "function define(deps, fn) { fn(); }\n"
		})
	]
};
