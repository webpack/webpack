"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const svg = fs.readFileSync(
			path.join(options.output.path, "icon.svg"),
			"utf8"
		);
		expect(svg).toMatchSnapshot();

		expect(svg).toContain('fill="red" stroke="#abcdef" stroke-width=".5"');
		expect(svg).toContain('fill="currentColor" opacity="1"');
		expect(svg).toContain('stop-color="#fff" stop-opacity=".5"');
		expect(svg).toContain('x="1" y="2" width="3" height="4"');
		expect(svg).toContain('r="2"');
		expect(svg).toContain('transform="translate(1 2)"');
		expect(svg).toContain('offset="0.50"');
	}
};
