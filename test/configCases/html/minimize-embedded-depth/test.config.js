"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);

		expect(page).toMatchSnapshot();

		// A body nested in a body: the SVG minifier is reached through the CSS in
		// an inline `<style>`, and again through the CSS in a `style` attribute.
		expect(page).toContain(
			"<style>.a{background:url(\"data:image/svg+xml,<svg> <rect fill='red' /> </svg>\");color:red}</style>"
		);
		expect(page).toContain(
			"<p style='background:url(\"data:image/svg+xml,<svg> <circle /> </svg>\")'>"
		);
		// Three deep: the document an `<iframe srcdoc>` holds carries its own
		// `<style>`, whose CSS is minified in turn.
		expect(page).toContain(
			'<iframe srcdoc="<style>.b{color:#0f0}</style><p class=c>inner">'
		);
	}
};
