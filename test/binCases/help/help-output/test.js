"use strict";

module.exports = function testAssertions(code, stdout, stderr) {
	expect(code).toBe(0);

	expect(stdout).toBeTruthy();

	const msg = 'webpack';
	expect(stdout[0]).toContain(msg);
	expect(stdout[0].indexOf(msg)).toBe(0);

	expect(stdout).toContain("Config options:");
	expect(stdout).toContain("Basic options:");
	expect(stdout).toContain("Module options:");
	expect(stdout).toContain("Output options:");
	expect(stdout).toContain("Advanced options:");
	expect(stdout).toContain("Resolving options:");
	expect(stdout).toContain("Optimizing options:");
	expect(stdout).toContain("Stats options:");
	expect(stdout).toContain("Options:");

	expect(stderr).toHaveLength(0);
};
