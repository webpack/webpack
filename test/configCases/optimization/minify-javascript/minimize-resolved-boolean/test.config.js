"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		// The built-in minimizer still ran with what the object form named, so the
		// marker comment minifying drops is gone.
		expect(
			fs.readFileSync(path.join(options.output.path, "bundle0.js"), "utf8")
		).not.toContain("javascript minify marker");
	}
};
