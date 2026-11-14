"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("pass(!1,-2)");
		expect(code).toContain("pass(-2,!1)");
		expect(code).toContain("pass(!0,!1)");
		expect(code).toContain("return!NaN");
	}
};
