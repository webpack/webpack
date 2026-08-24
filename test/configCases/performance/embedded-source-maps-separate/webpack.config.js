"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: "source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "warning",
		embeddedSourceMaps: true
	}
};
