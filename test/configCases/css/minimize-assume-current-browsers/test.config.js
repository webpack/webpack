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
		expect(css).toContain(".t01{display:flex;align-items:center}");
		expect(css).toContain(".t03{backdrop-filter:blur(4px)}");
		expect(css).toContain(".t02{display:flex;-webkit-box-pack:center;");
		expect(css).toContain(".t05{line-clamp:2}");
		expect(css).toContain(".t06{width:max-content}");
	}
};
