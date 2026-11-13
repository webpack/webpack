"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain('return[value+"",``+value,1-(value+"")]');
		expect(code).toContain("expect([void 0,97])");
		expect(code).toContain("expect([`function`,`object`,`function`])");
		expect(code).toContain("expect(typeof Symbol())");
	}
};
