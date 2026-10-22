"use strict";

// `output.pathinfo` is what development turns on, and what the harness sets —
// the header it writes above an inline sheet is what this case watches.

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
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
		css: true
	},
	node: {
		__dirname: false
	}
};
