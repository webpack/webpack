"use strict";

let run = 0;

module.exports = {
	moduleScope(scope, options) {
		if (!scope.window) {
			return;
		}

		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = `bundle${run === 0 ? "0" : "2"}.css`;
		scope.window.document.head.appendChild(link);

		run++;
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
