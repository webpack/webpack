"use strict";

module.exports = {
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		link.setAttribute("data-webpack", "test:chunk-main");
		document.head.appendChild(link);
	}
};
