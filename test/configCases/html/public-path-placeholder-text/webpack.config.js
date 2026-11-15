"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	module: {
		rules: [{ test: /page\.html$/, generator: { extract: true } }]
	},
	experiments: {
		html: true
	}
};
