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
	experiments: {
		css: true,
		cacheUnaffected: true
	}
};
