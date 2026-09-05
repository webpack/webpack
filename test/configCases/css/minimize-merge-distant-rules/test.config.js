"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const sections = readMinifiedSections(options.output.path, "bundle0.css");
		expect(sections).toMatchSnapshot();
		// What the option is for, and the four shapes it declines.
		const css = sections.join("");
		expect(css).toContain(".alpha,.gamma");
		expect(css).not.toContain(".delta,.epsilon");
		expect(css).not.toContain(".zeta,.eta");
		expect(css).not.toContain(".theta,.iota");
		expect(css).not.toContain(".kappa,.lambda-is-a-long-name");
	}
};
