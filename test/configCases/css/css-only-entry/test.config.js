"use strict";

module.exports = {
	findBundle(i, options) {
		return ["./runtime.js", "./main.js"];
	},
	moduleScope(scope) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "styles.css";
		scope.window.document.head.appendChild(link);
	}
};
