"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot();

		// A colour-only property takes a colour, and shortens it like any other.
		expect(css).toContain("border-block-start-color:red");
		// A property that accepts a negative keeps the sign.
		expect(css).toContain("scroll-margin-bottom:-5px");
		expect(css).toContain("offset-distance:-5px");
		// A position takes two components, which fold to one where they agree.
		expect(css).toContain("offset-anchor:50%");
		// A list of custom idents keeps both, with the separator tightened.
		expect(css).toContain("animation-trigger:a,b");
		// `initial` gives way to the property's own initial value where that is
		// shorter, which is the table being read.
		expect(css).toContain("contain-intrinsic-width:none");
	}
};
