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
		// `"all"` drops what `true` would have kept, banner and annotation alike.
		expect(css).not.toContain("an inert comment");
		expect(css).not.toContain("a banner");
		expect(css).not.toContain("@license");
		// ...and `preserveComments` outranks it, by string and by regexp.
		expect(css).toContain("keep: named by a preserveComments string");
		expect(css).toContain("a build-step marker");
	}
};
