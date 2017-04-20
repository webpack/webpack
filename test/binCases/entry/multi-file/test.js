"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	expect(code).toBe(0);

	expect(stdout).toBeTruthy();
	expect(stdout[4]).toContain("null.js");
	expect(stdout[5]).toMatch(/a\.js.*\{0\}/);
	expect(stdout[6]).toMatch(/index\.js.*\{0\}/);
	expect(stdout[7]).toMatch(/multi.*index\.js.*a\.js/); // should have multi-file entry
	expect(stderr).toHaveLength(0);
};

