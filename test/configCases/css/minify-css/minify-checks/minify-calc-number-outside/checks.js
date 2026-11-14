"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "minify-calc-number-outside.css"),
			"utf8"
		);
		expect(css).toMatchSnapshot("minify-calc-number-outside");

		// Gecko refuses each of these inside a `calc()` and reads the bare number
		// as a length, so unwrapping would bring the declaration back to life.
		expect(css).toContain("stroke-width:calc(2)");
		expect(css).toContain("stroke-dasharray:calc(1000)");
		expect(css).toContain("stroke-dashoffset:calc(1.5)");
		expect(css).toContain("-webkit-perspective:calc(1000)");
		// A unit settles it, and so does a property that reads a number as one;
		// a folded px length is then written in SVG user units.
		expect(css).toContain(".e,.f{stroke-width:2}");
		expect(css).toContain("opacity:.5");
		expect(css).toContain("z-index:2");
		expect(css).toContain("width:10px");
	}
};
