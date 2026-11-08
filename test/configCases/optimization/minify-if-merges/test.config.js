"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain('record(c?1:2,"a")');
		expect(code).toContain("record((a?b:c)?1:2)");
		expect(code).toContain("new Constructor((a?b:c)?1:2)");
		expect(code).toContain("push(a)&&push(b)?");
		expect(code).toContain("new F(c?1:2)");
	}
};
