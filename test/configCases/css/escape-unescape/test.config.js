"use strict";

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		document.head.appendChild(link);
	}
};
