"use strict";

module.exports = {
	setupDocument(document) {
		const light = document.createElement("link");
		light.rel = "stylesheet";
		light.href = "light.css";
		document.head.appendChild(light);
		const dark = document.createElement("link");
		dark.rel = "stylesheet";
		dark.href = "dark.css";
		document.head.appendChild(dark);
	},
	findBundle() {
		return ["./runtime.js", "./light.js", "./dark.js"];
	}
};
