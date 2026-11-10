"use strict";

module.exports = {
	setupDocument(document) {
		const link1 = document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "asyncChunk_js.css";
		document.head.appendChild(link1);
		const link2 = document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "asyncChunk2_js.css";
		document.head.appendChild(link2);
	},
	findBundle() {
		return [
			"./common-share_js-img_png.js",
			"./asyncChunk_js.js",
			"./main.js",
			"./secondMain.js",
			"./asyncChunk2_js.js"
		];
	}
};
