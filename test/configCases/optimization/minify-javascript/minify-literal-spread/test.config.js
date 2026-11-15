"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("[1,2,3]");
		expect(code).toContain("{a:1,b:2,c:3}");
		expect(code).toContain("(4,5)");
		expect(code).not.toContain("...null");
		expect(code).toContain("...[2,,3]");
		expect(code).toContain("...{get value()");
		expect(code).toContain("...{__proto__:null}");
		expect(code).toMatch(/\.\.\.["`]ab["`]/);
	}
};
