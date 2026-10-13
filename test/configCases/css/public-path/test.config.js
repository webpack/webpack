"use strict";

module.exports = {
	setupDocument(document, { options }) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${options.name}.css`;
		document.head.appendChild(link);
	}
};
