"use strict";

module.exports = {
	setupDocument(document, { options }) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = options.output.module ? "bundle1.css" : "bundle0.css";
		document.head.appendChild(link);
	},
	findBundle(i) {
		return i === 0 ? ["dynamic_css.bundle0.js", "bundle0.js"] : ["bundle1.mjs"];
	}
};
