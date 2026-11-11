"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		// A name only a dropped `++`/`--` held is gone: the declaration goes
		// with its one write.
		expect(code).not.toContain("aliveBareUpdate");
		expect(code).not.toContain("leftUpdateVar");
		expect(code).not.toContain("rightUpdateVar");
		// A name a later read keeps, or an operator a `||` guards, keeps its
		// `++` or `--`.
		expect(code).toContain("n++");
		expect(code).toContain("--n");
		// A member `unused` never names, or a parameter `arguments` aliases,
		// keeps its `++` too.
		expect(code).toContain(".p++");
		expect(code).toContain("a++");
	}
};
