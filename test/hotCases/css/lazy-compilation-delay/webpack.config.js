"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		cssFilename: "[name].css",
		cssChunkFilename: "[name].css"
	},
	experiments: {
		css: true,
		lazyCompilation: {
			entries: false,
			imports: true
		}
	},
	node: {
		__dirname: false
	}
};
