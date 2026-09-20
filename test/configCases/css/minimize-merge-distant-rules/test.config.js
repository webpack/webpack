"use strict";

const readMinifiedSections = require("../../../helpers/readMinifiedSections");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const sections = readMinifiedSections(options.output.path, "bundle0.css");
		expect(sections).toMatchSnapshot();
		// What the option is for, and the shapes it declines.
		const css = sections.join("");
		expect(css).toContain(".alpha,.gamma");
		expect(css).toContain(".iota,.theta");
		expect(css).not.toContain(".delta,.epsilon");
		expect(css).not.toContain(".zeta,.eta");
		expect(css).not.toContain(".mu,.nu");
		expect(css).not.toContain(".xi,.omicron");
		expect(css).not.toContain(".kappa,.lambda-is-a-long-name");
		// The same gates, asked of a block's children rather than of the sheet.
		expect(css).toContain(".pi,.sigma");
		expect(css).not.toContain(".tau,.phi");
		expect(css).not.toContain(".chi,.omega");
	}
};
