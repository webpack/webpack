"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			"css/auto": {
				fontFace: true
			}
		}
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
