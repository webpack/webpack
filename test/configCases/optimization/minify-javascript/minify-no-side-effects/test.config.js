"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain('declared("declared")');
		expect(code).not.toContain('expression("expression")');
		expect(code).not.toContain('statement("statement")');
		expect(code).not.toContain('"nested"');
		expect(code).toContain('late("early")');
		expect(code).toContain('reassigned("reassigned")');
	}
};
