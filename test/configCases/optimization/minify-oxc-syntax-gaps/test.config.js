"use strict";

const fs = require("fs");
const path = require("path");

// The config leaving `mangle` off, whose names no analysis proves global.
const UNMANGLED = 0;

module.exports = {
	afterExecute(options) {
		for (const [index, config] of options.entries()) {
			const code = fs.readFileSync(
				path.join(config.output.path, `bundle${index}.js`),
				"utf8"
			);
			expect(code).toContain("RegExp(10n)");
			expect(code).toContain("get null(");
			if (index !== UNMANGLED) {
				expect(code).not.toContain("new RegExp");
				expect(code).toContain("NaN(){");
			}
		}
	}
};
