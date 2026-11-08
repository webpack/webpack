"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toMatch(/"ab"\+x|`ab\$\{x\}`/);
		expect(code).toContain("v>>>s");
		expect(code).not.toContain("String(");
		expect(code).toContain("/c/g");
		expect(code).not.toMatch(/\$\{\/c\/g\}/);
	}
};
