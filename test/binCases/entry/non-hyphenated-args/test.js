"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	expect(code).toBe(0);

	expect(stdout).toBeTruthy();
	expect(stdout[4]).toContain("null.js");
	expect(stdout[5]).toContain("main.js"); // non-hyphenated arg ./a.js should create chunk "main"
	expect(stdout[6]).toMatch(/a\.js.*\{1\}/); // a.js should be in chunk 1
	expect(stdout[7]).toMatch(/index\.js.*\{0\}/); // index.js should be in chunk 0
	expect(stderr).toHaveLength(0);
};

