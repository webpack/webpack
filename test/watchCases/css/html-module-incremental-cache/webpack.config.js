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
		htmlFilename: "[name].html"
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true,
		css: true,
		cacheUnaffected: true
	},
	node: {
		__dirname: false
	}
};
