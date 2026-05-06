"use strict";

module.exports = {
	moduleScope(scope, options) {
		// Only the "link" exportType emits a separate CSS chunk file. The other
		// exportTypes (text/css-style-sheet/style) inline or inject CSS via JS,
		// so attaching a <link> for them would point at a non-existent file.
		if (options.name !== "link") return;

		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		scope.window.document.head.appendChild(link);
	}
};
