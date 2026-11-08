"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).not.toContain('"circle"');
		expect(code).toContain('if(!flag)log.push("else")');
		expect(code).toContain('found:{log.push("one");break found}');
		expect(code).not.toContain('"two"');
		expect(code).toContain('if(1===at())log.push("at");else log.push("one")');
		expect(code).toContain("if(flag)break");
		expect(code).toContain("log.push(typeof held);var held;");
	}
};
