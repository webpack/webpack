"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		htmlFilename: "[path][name].html",
		htmlChunkFilename: "[path][name].html"
	},
	module: {
		parser: {
			html: {
				// bundle the linked page as its own `type: html` page
				sources: ["...", { tag: "a", attribute: "href", type: "html" }]
			}
		}
	},
	experiments: {
		html: true,
		futureDefaults: true
	}
};
