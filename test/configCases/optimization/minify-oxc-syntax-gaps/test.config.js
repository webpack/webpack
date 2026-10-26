"use strict";

const fs = require("fs");
const path = require("path");

// The config keeping quoted keys apart, and the one leaving `side_effects` off.
const KEEPS_QUOTES = 2;
const KEEPS_EFFECTS = 3;

module.exports = {
	afterExecute(options) {
		for (const [index, config] of options.entries()) {
			const code = fs.readFileSync(
				path.join(config.output.path, `bundle${index}.js`),
				"utf8"
			);
			expect(code).toContain("RegExp(10n)");
			expect(code).not.toContain("new RegExp");
			expect(code).toContain("NaN(){");
			expect(code).toContain("get null(");
			const merged = !/\?\w\.read\(\):\w\.read\(\)/.test(code);
			expect(merged).toBe(index !== KEEPS_QUOTES);
			expect(code).toContain(
				index === KEEPS_EFFECTS ? "finally{return 2}" : "finally{return}"
			);
		}
	}
};
