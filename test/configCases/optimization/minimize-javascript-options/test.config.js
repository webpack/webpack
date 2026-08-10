"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const bundle = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		// The minimizer ran (comments are dropped), but with the configured
		// options: `mangle: false` keeps the authored name.
		expect(bundle).toContain("importantMarkerValue");
		expect(bundle).not.toContain("comment marker the minifier drops");
	}
};
