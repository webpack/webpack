"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	expect(code).toBe(0);

	expect(stdout).toBeTruthy();
	expect(stdout[4]).toContain("null.js");
	expect(stdout[5]).toContain("foo.js"); // named entry from --entry foo=./a.js
	expect(stdout[6]).toMatch(/a\.js.*\{1\}/);
	expect(stdout[7]).toMatch(/index\.js.*\{0\}/);
	expect(stderr).toHaveLength(0);
};

