"use strict";

module.exports = {
	setupDocument(document) {
		const link1 = document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "one.css";
		document.head.appendChild(link1);
		const link2 = document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "two.css";
		document.head.appendChild(link2);
	},
	findBundle() {
		return [
			"async-one_js-c_css-d_css.chunk.js",
			"one.js",
			"async-two_js-c_css-d_css.chunk.js",
			"two.js"
		];
	}
};
