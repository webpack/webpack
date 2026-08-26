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
		// A pattern stands in for the banner rule rather than beside it, so a
		// banner it does not name goes with every other comment.
		expect(css).not.toContain("an inert comment");
		expect(css).not.toContain("a banner the pattern does not name");
		expect(css).not.toContain("@license");
		// ...and what it does name survives, banner or not.
		expect(css).toContain("keep: named by the pattern");
		expect(css).toContain("keep: a banner the pattern does name");
	}
};
