"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("case 0:return tag`x`;case 1:return tag`x`");
		expect(code).toContain("case 0:case 1:return`zero or one`");
	}
};
