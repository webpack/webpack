"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: {
			html: {
				// Treat `<a href>` like a link to another HTML page: the
				// referenced file is bundled as its own emitted page and the
				// href is rewritten to its output filename. `"..."` keeps defaults.
				sources: ["...", { tag: "a", attribute: "href", type: "html" }]
			}
		}
	},
	experiments: {
		html: true
	}
};
