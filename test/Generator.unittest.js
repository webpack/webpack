"use strict";

const Generator = require("../lib/Generator");
const { JAVASCRIPT_TYPE } = require("../lib/ModuleSourceTypeConstants");
const ModuleParseError = require("../lib/errors/ModuleParseError");
const WebAssemblyJavascriptGenerator = require("../lib/wasm-sync/WebAssemblyJavascriptGenerator");

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

describe("WebAssemblyJavascriptGenerator.generateError", () => {
	// asserted on the generated source: a sync wasm module cannot show this at
	// runtime, the engine rejects the emitted asset before the throw is reached
	/** @type {(error: Error) => string} */
	const generate = (error) =>
		/** @type {import("webpack-sources").Source} */
		(
			new WebAssemblyJavascriptGenerator().generateError(
				error,
				/** @type {EXPECTED_ANY} */ ({}),
				/** @type {EXPECTED_ANY} */ ({ type: JAVASCRIPT_TYPE })
			)
		)
			.source()
			.toString();

	it("should throw a WebAssembly.CompileError for a rejected binary", () => {
		expect(
			generate(
				new ModuleParseError(
					"\u0000asm",
					new Error("magic header not detected"),
					[],
					"webassembly/sync"
				)
			)
		).toMatch(/^throw new WebAssembly\.CompileError\(/);
	});

	it("should throw a plain Error for any other build failure", () => {
		expect(generate(new Error("loader boom"))).toBe(
			'throw new Error("loader boom");'
		);
	});
});
