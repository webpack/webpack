"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		// Excluded, so the bundle keeps the marker minifying would have dropped.
		expect(
			fs.readFileSync(path.join(options.output.path, "bundle0.js"), "utf8")
		).toContain("javascript minify excluded marker");
	}
};
