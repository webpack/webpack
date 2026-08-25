"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: "inline-source-map",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "stats",
		embeddedSourceMaps: true
	}
};
