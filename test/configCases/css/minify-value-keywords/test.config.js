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

		// A two-value display reads back as the short form it names.
		expect(css).toContain("display:flow-root");
		expect(css).toContain("display:inline-block");
		// The one pair with no short form keeps both words.
		expect(css).toContain("display:inline flex");
		// A cubic-bezier the spec names is written as that name.
		expect(css).toContain("transition-timing-function:ease-in-out");
		expect(css).not.toContain("cubic-bezier");
		// Absolute sizes and generic families name no file, so they stand.
		expect(css).toContain("font-size:xxx-large");
		expect(css).toContain("font-family:ui-sans-serif");
		// A shouted unit or function takes its canonical spelling, which is not
		// its lowercase one.
		expect(css).toContain("pitch:1kHz");
		expect(css).toContain("width:1Q");
		expect(css).toContain("transform:rotateX(45deg)");
		// `rotateZ`, `skewX` and `translateX` each fold to the shorter name that
		// means the same thing on one axis.
		expect(css).toContain("transform:rotate(45deg)");
		expect(css).toContain("transform:skew(45deg)");
		expect(css).toContain("transform:translate(10px)");
	}
};
