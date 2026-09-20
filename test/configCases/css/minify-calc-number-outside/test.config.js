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

		// Gecko refuses each of these inside a `calc()` and reads the bare number
		// as a length, so unwrapping would bring the declaration back to life.
		expect(css).toContain("stroke-width:calc(2)");
		expect(css).toContain("stroke-dasharray:calc(1000)");
		expect(css).toContain("stroke-dashoffset:calc(1.5)");
		expect(css).toContain("-webkit-perspective:calc(1000)");
		// A unit settles it, and so does a property that reads a number as one.
		expect(css).toContain("stroke-width:2px");
		expect(css).toContain("opacity:.5");
		expect(css).toContain("z-index:2");
		expect(css).toContain("width:10px");
	}
};
