"use strict";

// `output.filename` and `output.cssFilename` name no chunk here, so the page's
// `<script>`/`<link>` entries take a `[name]`, filled in from each tag's url.

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
	entry: {
		main: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: "js/bundle.js",
		cssFilename: "styles.css"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		css: true
	}
};
