"use strict";

const findOutputFiles = require("../../../helpers/findOutputFiles");

module.exports = {
	findBundle(i, options) {
		const async1 = findOutputFiles(options, /^async.async_js.+.js/)[0];
		const async2 = findOutputFiles(options, /^async.async_css.+.js/)[0];
		const bundle = findOutputFiles(options, /^bundle.+.js/)[0];
		return [async1, async2, bundle];
	},
	setupDocument(document, { options }) {
		// Anchor `.css$` so the unordered readdir doesn't pick `.css.map`.
		const bundle = findOutputFiles(options, /^bundle\..+\.css$/)[0];
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = bundle;
		document.head.appendChild(link);
	}
};
