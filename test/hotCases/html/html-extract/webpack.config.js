"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	module: {
		generator: {
			html: {
				// Force the JS shim to emit DOM-patching HMR code even though
				// `./page.html` is reached through `index.js` (not as an
				// entry).
				extract: true
			}
		}
	},
	experiments: {
		html: true
	}
};
