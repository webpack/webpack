"use strict";

module.exports = {
	findBundle() {
		return ["main.js"];
	},
	setupDocument(document) {
		const link1 = document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "main.css";
		document.head.appendChild(link1);
		const link2 = document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "vendors.css";
		document.head.appendChild(link2);
	}
};
