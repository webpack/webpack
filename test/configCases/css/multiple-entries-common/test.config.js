"use strict";

let once = false;

module.exports = {
	moduleScope(scope) {
		if (once) {
			return;
		}

		const link1 = scope.window.document.createElement("link");
		link1.rel = "stylesheet";
		link1.href = "one.css";
		scope.window.document.head.appendChild(link1);
		const link2 = scope.window.document.createElement("link");
		link2.rel = "stylesheet";
		link2.href = "two.css";
		scope.window.document.head.appendChild(link2);
		once = true;
	},
	findBundle() {
		return [
			"async-one_js-c_css-d_css.chunk.js",
			"one.js",
			"async-two_js-c_css-d_css.chunk.js",
			"two.js"
		];
	}
};
