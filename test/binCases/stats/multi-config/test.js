"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	expect(code).toBe(0);
	expect(stdout).toBeTruthy();
	expect(stderr).toHaveLength(0);
};
