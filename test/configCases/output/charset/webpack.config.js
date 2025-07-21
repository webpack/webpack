"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		charset: false
	},
	performance: {
		hints: false
	},
	experiments: {
		css: true
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	}
};
