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

		// Chromium refuses the keyword outright, so writing it back drops the
		// declaration rather than shortening it.
		expect(css).toContain("outline-color:initial");
		expect(css).toContain("text-emphasis-position:initial");
		// Chromium computes a different value from the keyword the spec names.
		expect(css).toContain("overflow-block:initial");
		expect(css).toContain("overflow-inline:initial");
		expect(css).toContain("text-autospace:initial");
		// Gecko reads `none` as `auto`; WebKit reads `row` as `normal` and the
		// prefixed `user-select` as `text`, which the standard spelling carries
		// since the value rules run on it.
		expect(css).toContain("font-synthesis-position:initial");
		expect(css).toContain("grid-auto-flow:initial");
		expect(css).toContain("user-select:initial");
		expect(css).toContain("-webkit-user-select:initial");
		// Where the engine reads the keyword as `initial`, it is still written.
		expect(css).toContain("text-fit:none");
		expect(css).toContain("caption-side:top");
		expect(css).toContain("empty-cells:show");
	}
};
