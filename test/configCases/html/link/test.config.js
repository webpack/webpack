"use strict";

module.exports = {
	setupDocument(document, { index }) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${index}.css`;
		document.head.appendChild(link);
	}
};
