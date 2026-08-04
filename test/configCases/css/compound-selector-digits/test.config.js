"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);
		// A class name ending in a digit is still an ident, so the `.` that follows
		// it starts another class of the same compound — not a descendant.
		expect(css).toContain(".p1.c1");
		expect(css).toContain("div.parent1.child1");
		expect(css).toContain(":is(div.a1.b2)");
		// A number is a different token: `1` and `.5px` would read back as `1.5px`.
		expect(css).toContain("1 .5px");
	}
};
