"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const svg = fs.readFileSync(
			path.join(options.output.path, "icon.svg"),
			"utf8"
		);
		expect(svg).toContain('<rect   x="1"   fill="#ff0000"/>');
	}
};
