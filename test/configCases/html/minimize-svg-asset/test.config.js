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

		expect(svg).toContain('<rect x="1" y="2" width="3" fill="red" class=""/>');
		expect(svg).toContain("<p ");
		expect(svg).toContain("</p><p ");
		expect(svg).toContain("tom &amp; jerry, 1 &lt; 2");
		expect(svg).toContain("<![CDATA[if (0 < 1) {}]]>");
	}
};
