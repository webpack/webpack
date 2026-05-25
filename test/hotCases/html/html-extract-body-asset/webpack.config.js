"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	module: {
		generator: {
			html: {
				// Force the extract / DOM-patch shim even though `./page.html`
				// is reached through `index.js` rather than as an entry.
				extract: true
			}
		}
	},
	experiments: {
		html: true
	}
};
