"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	node: {
		__dirname: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true
	},
	optimization: {
		chunkIds: "named"
	}
};
