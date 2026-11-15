"use strict";

module.exports = {
	setupDocument(document, { index }) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${index}.css`;
		document.head.appendChild(link);
	},
	findBundle(i) {
		if (i === 2) {
			return ["bundle2.mjs"];
		}

		return [
			`file_text_other.bundle${i}.${i === 2 ? "mjs" : "js"}`,
			`bundle${i}.${i === 2 ? "mjs" : "js"}`
		];
	}
};
