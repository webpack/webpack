"use strict";

module.exports = {
	setupDocument(document, { options }) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = options.output.filename.replace("js", "css");
		document.head.appendChild(link);
	}
};
