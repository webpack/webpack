"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		resourceHints: {
			dedupe: true
		}
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
