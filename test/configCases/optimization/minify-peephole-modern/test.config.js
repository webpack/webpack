"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return "bundle0.js";
	},
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("#used");
		expect(code).toContain("{__proto__:");
		expect(code).toContain('{["__proto__"]:');
	}
};
