"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("flag=!!c");
		expect(code).toContain("named=function(){var named=1;return named}");
		expect(code).toContain("function keptName(read=keptName)");
		expect(code).toContain('log.push("test")');
		expect(code).not.toContain("typeof missing");
		expect(code).toContain("return 2+3");
	}
};
