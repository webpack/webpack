"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const css = fs.readFileSync(
			path.resolve(options.output.path, "bundle0.css"),
			"utf8"
		);
		// Read as UTF-8 wherever it is served, so nothing has to say so.
		expect(css).toBe(
			'.icon:before{content:"\u{F0A86}"}.accent:before{content:"é"}'
		);
	}
};
