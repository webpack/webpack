"use strict";

module.exports = {
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "chunk1.css";
		document.head.appendChild(link);
	}
};
