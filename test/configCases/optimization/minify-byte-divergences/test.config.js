"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("new Base.Child(2)");
		expect(code).toContain("a?!0:o.y=1");
		expect(code).toContain("if(n)return n");
	}
};
