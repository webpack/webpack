"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const sections = readMinifiedSections(options.output.path, "bundle0.css");
		expect(sections).toMatchSnapshot();
		const css = sections.join("");
		// What the option is for: with no selection the earlier declaration is
		// dropped on the assumption the later one is read.
		expect(css).toContain(".t01{color:lab(50% 100 -100)}");
		expect(css).toContain(".t02{display:flex}");
		// What it still declines, each for a reason of its own.
		expect(css).toContain(".t10{color:red!important;color:blue}");
		expect(css).toContain(".t12{--x:red;--x:lab(50% 100 -100)}");
	}
};
