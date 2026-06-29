"use strict";

module.exports = {
	findBundle(i) {
		return [`bundle${i}.js`];
	},
	moduleScope(scope) {
		if (scope.window.__cssLinkInjected) return;
		scope.window.__cssLinkInjected = true;
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
