"use strict";

module.exports = {
	moduleScope(scope, options) {
		if (options.name.includes("node")) {
			delete scope.window;
			delete scope.document;
			delete scope.self;
		} else {
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
