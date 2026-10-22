"use strict";

module.exports = {
	findBundle(i) {
		return [`bundle${i}.js`];
	},
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		document.head.appendChild(link);
	}
};
