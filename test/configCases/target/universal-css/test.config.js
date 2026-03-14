"use strict";

module.exports = {
	moduleScope(scope, options, target) {
		if (target === "web") {
			const link = scope.window.document.createElement("link");
			link.rel = "stylesheet";
			link.href = "main.css";
			scope.window.document.head.appendChild(link);
		}
	},
	findBundle() {
		return ["./separate.mjs", "./main.mjs"];
	}
};
