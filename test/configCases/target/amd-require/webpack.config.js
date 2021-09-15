const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "amd-require"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"var nodeRequire = require;\nvar require = function(deps, fn) { fn(); }\n"
		})
	]
};
