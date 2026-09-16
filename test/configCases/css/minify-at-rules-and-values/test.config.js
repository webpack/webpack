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

		// Two `@document` blocks with the same prelude gather into one; the
		// prefixed spelling is a different rule and stays apart.
		expect(css).toContain("@document url(https://a.test/){.a{color:red}");
		expect(css).toContain("@-moz-document");
		expect(css.match(/@document/g)).toHaveLength(1);
		// A shorthand whose initial keyword is the whole value keeps it.
		expect(css).toContain("mask-border:initial");
		expect(css).toContain("text-emphasis:initial");
		// The last colour stop's position is the one the gradient implies.
		expect(css).toContain("repeating-radial-gradient(red 0%,blue)");
		expect(css).toContain("cross-fade(");
	}
};
