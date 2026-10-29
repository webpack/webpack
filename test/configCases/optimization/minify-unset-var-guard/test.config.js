"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain("Direction||");
		expect(code).not.toContain("Level||");
		expect(code).toContain("cache||");
	}
};
