const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: false,
	plugins: [
		new webpack.WarnNonEsmSourceTypePlugin(
			path.resolve(__dirname, "cases/track")
		),
		new webpack.WarnNonEsmSourceTypePlugin(/auto/)
	]
};
