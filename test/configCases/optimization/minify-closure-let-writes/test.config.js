"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain("lastSeen");
		expect(code).toContain("pending=");
		expect(code).toContain("seen=");
	}
};
