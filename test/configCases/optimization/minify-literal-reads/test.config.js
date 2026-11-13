"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("expect(`a,b`)");
		expect(code).toContain("return!(x<0)^y");
		expect(code).toContain("return(0|x)^1n");
		expect(code).toContain("expect({b:1})");
		expect(code).toContain(
			"note(`tilde`),note(`minus`),note(`again`),note(`void`)"
		);
		expect(code).toContain("expect(`prod`)");
	}
};
