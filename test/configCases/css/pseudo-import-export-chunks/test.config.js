"use strict";

module.exports = {
	findBundle() {
		return [
			"async-shared_modules_css.chunk.js",
			"async-different_modules_css.chunk.js",
			"chain-end_modules_css.chunk.js",
			"async-custom_modules_css.chunk.js",
			"async-a_modules_css.chunk.js",
			"async-b_modules_css.chunk.js",
			"async-mixed_modules_css.chunk.js",
			"bundle0.js"
		];
	},
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		document.head.appendChild(link);
	}
};
