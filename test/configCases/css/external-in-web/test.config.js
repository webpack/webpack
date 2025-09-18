"use strict";

module.exports = {
	moduleScope(scope, stats) {
		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = stats.experiments.outputModule ? "bundle1.css" : "bundle0.css";
		scope.window.document.head.appendChild(link);
	},
	findBundle(i) {
		return i === 0 ? ["dynamic_css.bundle0.js", "bundle0.js"] : ["bundle1.mjs"];
	}
};
