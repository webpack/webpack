"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "inline-source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "warning",
		sourceMaps: true
	}
};
