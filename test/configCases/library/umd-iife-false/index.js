export const answer = 42;

it("should still build a runnable umd bundle", function () {
	expect(answer).toBe(42);
});

it("should wrap the bootstrap in an IIFE despite 'output.iife: false'", function () {
	const fs = require("fs");
	const content = fs.readFileSync(__filename, "utf-8");
	expect(content).toMatch(/return \/\*{6}\/ \(\(\) => \{ \/\/ webpackBootstrap/);
});
