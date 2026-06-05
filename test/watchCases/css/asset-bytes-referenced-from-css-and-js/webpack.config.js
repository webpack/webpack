"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	cache: {
		type: "memory",
		cacheUnaffected: true
	},
	output: {
		cssFilename: "[name].css"
	},
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/bytes"
			}
		]
	},
	experiments: {
		css: true,
		cacheUnaffected: true
	},
	node: {
		__dirname: false
	}
};
