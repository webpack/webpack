"use strict";

const Generator = require("../lib/Generator");
const ModuleParseError = require("../lib/errors/ModuleParseError");

describe("Generator.throwBuildErrorCode", () => {
	// `loc` keeps the message deterministic: without it the inner stack, which
	// carries absolute paths, is appended instead.
	const parseError = () =>
		new ModuleParseError(
			"const = 1;",
			Object.assign(new Error("Unexpected token"), {
				loc: { line: 1, column: 6 }
			}),
			[],
			"javascript/auto"
		);

	it("should throw a SyntaxError for a source the parser rejected", () => {
		expect(Generator.throwBuildErrorCode(parseError())).toMatchInlineSnapshot(
			'"throw new SyntaxError(\\"Module parse failed: Unexpected token\\\\nFile was parsed as module type \'javascript/auto\'.\\\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\\\n> 1 | const = 1;\\\\n    |       ^\\");"'
		);
	});

	it("should throw the given constructor for a rejected source", () => {
		expect(
			Generator.throwBuildErrorCode(parseError(), "WebAssembly.CompileError")
		).toMatchInlineSnapshot(
			'"throw new WebAssembly.CompileError(\\"Module parse failed: Unexpected token\\\\nFile was parsed as module type \'javascript/auto\'.\\\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\\\n> 1 | const = 1;\\\\n    |       ^\\");"'
		);
	});

	it("should throw a plain Error for any other build failure", () => {
		expect(
			Generator.throwBuildErrorCode(new Error("loader boom"))
		).toMatchInlineSnapshot('"throw new Error(\\"loader boom\\");"');
	});

	it("should keep the constructor override off a non-parse error", () => {
		expect(
			Generator.throwBuildErrorCode(
				new Error("loader boom"),
				"WebAssembly.CompileError"
			)
		).toMatchInlineSnapshot('"throw new Error(\\"loader boom\\");"');
	});
});
