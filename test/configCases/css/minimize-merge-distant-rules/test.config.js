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
		// The same, for at-rules: those join by stating one condition twice, and
		// a run of them gathers into the first.
		expect(css).toContain("@media (width>=100px){.mu{color:red}.nu");
		expect(css).toContain(".xi{color:lime}}");
		expect(css).not.toContain(".omicron{color:red}.pi");
		expect(css).not.toContain(".rho{width:0}.sigma");
		expect(css).not.toContain(".tau{color:red}.upsilon");
		expect(css).not.toContain(".chi{color:red}.psi");
		expect(css).toContain(
			"@keyframes phi{0%{opacity:0}}.between-frames{margin:2px}@keyframes phi{to{opacity:1}}"
		);
	}
};
