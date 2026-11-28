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
		// A `break` ending a case of the `switch`'s own label leaves it alike.
		expect(code).not.toContain("found:");
		expect(code).toContain('function(log){log.push("one");return log}');
		expect(code).not.toContain('"two"');
		expect(code).toContain('1===at()?log.push("at"):log.push("one")');
		expect(code).toContain("if(flag)break");
		expect(code).toContain('function(log){return log.push("undefined"),log}');
	}
};
