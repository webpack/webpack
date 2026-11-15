"use strict";

module.exports = {
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "main.css";
		document.head.appendChild(link);
	},
	findBundle() {
		return ["./separate.mjs", "./main.mjs"];
	}
};
