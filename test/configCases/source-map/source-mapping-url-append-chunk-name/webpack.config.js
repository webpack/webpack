"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "deterministic"
	},
	output: {
		chunkFilename: "[id].js"
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "[file].map",
			append: "\n//# sourceMappingURL=https://maps.example.com/[name]/[url]"
		})
	]
};
