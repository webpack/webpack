"use strict";

module.exports = {
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://test.cases/path/bundle.css";
		document.head.appendChild(link);
	},
	env: "jsdom"
};
