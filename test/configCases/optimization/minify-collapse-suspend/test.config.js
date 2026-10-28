"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const code = fs.readFileSync(
			path.join(options.output.path, "bundle0.js"),
			"utf8"
		);
		expect(code).toContain("return await f(1)");
		expect(code).toContain("yield f(3)");
		expect(code).toContain("yield*record([4])");
		expect(code).toContain(".map(x=>x+1)");
		expect(code).toMatch(/let \w+=f\(5\);yield/);
		expect(code).toContain("registry.add([x=>x+1])");
		expect(code).toContain("registry.add({double:x=>x*2})");
	}
};
