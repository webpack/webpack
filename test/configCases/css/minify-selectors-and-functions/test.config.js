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

		// Rules that print alike gather into one selector list, so the ones the
		// minifier cannot join are the ones carrying an argument or a prefix.
		expect(css).toContain("::checkmark");
		expect(css).toContain("::highlight(x)");
		expect(css).toContain(":volume-locked");
		expect(css).toContain(":-moz-read-write");
		// A prefixed property spells its keywords its own way, so neither name
		// is swapped for the other.
		expect(css).toContain("-webkit-ruby-position:over");
		expect(css).toContain("-webkit-text-orientation:mixed");
		// A substitution function is a value the minifier hands back whole.
		expect(css).toContain("random-item(--k,1px,2px)");
	}
};
