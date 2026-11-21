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
		expect(code).toContain("named=function(){return 1}");
		expect(code).toContain("function keptName(read=keptName)");
		expect(code).toContain('log.push("test")');
		expect(code).not.toContain("typeof missing");
		expect(code).toContain("function bare(c){if(c)return 5}");
	}
};
