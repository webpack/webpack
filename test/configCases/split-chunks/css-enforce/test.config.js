"use strict";

module.exports = {
	findBundle() {
		return ["main.js"];
	},
	moduleScope(scope) {
		const link1 = scope.window.document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "main.css";
		scope.window.document.head.appendChild(link1);
		const link2 = scope.window.document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "vendors.css";
		scope.window.document.head.appendChild(link2);
	}
};
