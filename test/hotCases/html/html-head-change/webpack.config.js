"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	module: {
		generator: {
			html: {
				// Opt the HTML module into the DOM-patch HMR path even
				// though it isn't reached as a compilation entry.
				extract: true
			}
		}
	},
	experiments: {
		html: true
	}
};
