"use strict";

module.exports = function testAssertions(stdout, stderr, done) {
	expect(stdout).toBeTruthy();
	expect(stdout[0]).toBeFalsy();
	expect(stdout[1]).toContain("Webpack is watching the files…");

	expect(stderr).toHaveLength(0);
	done();
};
