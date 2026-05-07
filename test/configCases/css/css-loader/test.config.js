"use strict";

const path = require("path");

module.exports = {
	moduleScope(scope, options) {
		// Only the "link" exportType emits a separate CSS chunk file. The other
		// exportTypes (text/css-style-sheet/style) inline or inject CSS via JS,
		// so attaching a <link> for them would point at a non-existent file.
		if (options.name !== "link") return;

		// Derive the CSS chunk filename from the JS bundle filename (e.g.
		// `bundle0.js` -> `bundle0.css`). This stays correct if the configs
		// are reordered or output filenames change.
		const jsFilename = options.output.filename;
		const cssFilename = `${path.basename(jsFilename, path.extname(jsFilename))}.css`;

		const link = scope.window.document.createElement("link");
		link.rel = "stylesheet";
		link.href = cssFilename;
		scope.window.document.head.appendChild(link);
	}
};
