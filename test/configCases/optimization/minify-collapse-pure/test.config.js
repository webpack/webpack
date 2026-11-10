"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		// Unquoted, as a string may print as a template.
		const printed = code.replace(/["'`]/g, "");
		expect(printed).toContain("jsx(div,[jsx(b,[]),jsx(i,[])])");
		expect(printed).toMatch(
			/let \w+=jsx\(i,\[\]\);return jsx\(div,\[log\(b\),\w+\]\)/
		);
	}
};
