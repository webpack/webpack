"use strict";

const Generator = require("../lib/Generator");
const ModuleParseError = require("../lib/errors/ModuleParseError");

describe("Generator.throwBuildErrorCode", () => {
	const parseError = () =>
		new ModuleParseError("boom", new Error("bad token"), [], "javascript/auto");

	it("should throw a SyntaxError for a source the parser rejected", () => {
		expect(Generator.throwBuildErrorCode(parseError())).toMatch(
			/^throw new SyntaxError\(/
		);
	});

	it("should throw the given constructor for a rejected source", () => {
		expect(
			Generator.throwBuildErrorCode(parseError(), "WebAssembly.CompileError")
		).toMatch(/^throw new WebAssembly\.CompileError\(/);
	});

	it("should throw a plain Error for any other build failure", () => {
		expect(Generator.throwBuildErrorCode(new Error("loader boom"))).toBe(
			'throw new Error("loader boom");'
		);
	});

	it("should keep the constructor override off a non-parse error", () => {
		expect(
			Generator.throwBuildErrorCode(
				new Error("loader boom"),
				"WebAssembly.CompileError"
			)
		).toBe('throw new Error("loader boom");');
	});
});
