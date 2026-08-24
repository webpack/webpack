"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	ecmaConformance: true,
	findBundle() {
		return ["./lazy.js", "./bundle0.js"];
	},
	afterExecute(options) {
		// The harness runs this bundle as a browser, so the Node.js half is read
		// rather than executed: a bare `self` in the registration that runs at
		// startup is a ReferenceError there.
		const bundle = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		const registration = bundle
			.split("\n")
			.filter((line) => line.includes('"webpackChunk"'))
			.join("\n");
		expect(registration).not.toBe("");
		expect(registration).toContain('typeof self !== "undefined"');
	}
};
