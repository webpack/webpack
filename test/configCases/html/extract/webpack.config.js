"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		generator: {
			html: {
				extract: true,
				filename: "[name].html"
			}
		}
	},
	experiments: {
		html: true
	}
};
