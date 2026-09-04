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
		// What goes, and the shapes that stay.
		expect(css).not.toContain("-ms-expand");
		expect(css).not.toContain("-ms-input-placeholder");
		expect(css).not.toContain("-o-prefocus");
		expect(css).toContain("-webkit-slider-thumb");
		expect(css).toContain("-moz-range-thumb");
		expect(css).toContain("-ms-track");
		expect(css).toContain("-ms-clear");
	}
};
