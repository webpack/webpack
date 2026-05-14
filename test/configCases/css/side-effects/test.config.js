"use strict";

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	moduleScope(scope) {
		// `moduleScope` can run more than once (initial setup + per-module
		// evaluation). Guard against duplicate <link> tags being appended.
		if (scope.window.__cssLinkInjected) return;
		scope.window.__cssLinkInjected = true;
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
