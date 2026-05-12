"use strict";

const HREF = "bundle0.css";

module.exports = {
	moduleScope(scope) {
		const { document } = scope.window;
		const existing = document
			.getElementsByTagName("link")
			.find((l) => l.href.endsWith(HREF));
		if (existing) return;
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = HREF;
		document.head.appendChild(link);
	}
};
