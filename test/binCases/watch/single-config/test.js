"use strict";

module.exports = function testAssertions(stdout, stderr, done) {
	expect(stdout).toBeTruthy();
	expect(stdout[0]).toBe("");
	expect(stdout[1]).toBe("Webpack is watching the files…");

	expect(stderr).toHaveLength(0);
	done();
};
