"use strict";

const path = require("path");
const Generator = require("../../lib/module/Generator");
const {
	CSS_TYPE,
	JAVASCRIPT_TYPE
} = require("../../lib/module/ModuleSourceTypeConstants");
const RequestShortener = require("../../lib/util/RequestShortener");
const CssGenerator = require("../../lib/css/CssGenerator");
const ModuleParseError = require("../../lib/errors/ModuleParseError");
const WebAssemblyJavascriptGenerator = require("../../lib/wasm-sync/WebAssemblyJavascriptGenerator");

const requestShortener = new RequestShortener("/project");
const repositoryShortener = new RequestShortener(path.join(__dirname, "../.."));

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

	it("should write the stack a parse error without a location appends relative", () => {
		const error = new ModuleParseError(
			"const = 1;",
			Object.assign(new Error("Unexpected token"), {
				stack: "Error: Unexpected token\n    at parse (/project/parser.js:3:9)"
			}),
			[],
			"javascript/auto"
		);
		const code = Generator.throwBuildErrorCode(
			error,
			undefined,
			requestShortener
		);

		expect(code).toContain("Module parse failed: Unexpected token");
		expect(code).toContain("at parse (./parser.js:3:9)");
	});
});

describe("Generator.buildErrorMessage", () => {
	/** @type {(message: string) => Error} */
	const errorWith = (message) => Object.assign(new Error("boom"), { message });

	it("should keep a message that carries no stack", () => {
		expect(Generator.buildErrorMessage(new Error("loader boom"))).toBe(
			"loader boom"
		);
	});

	it("should keep the frames of the files the project builds from", () => {
		const error = errorWith(
			"loader boom\n    at Object.loader (/project/loader.js:2:7)\n    at transform (/project/node_modules/a-loader/index.js:11:3)"
		);

		expect(Generator.buildErrorMessage(error, requestShortener)).toBe(
			"loader boom\n    at Object.loader (./loader.js:2:7)\n    at transform (./node_modules/a-loader/index.js:11:3)"
		);
	});

	it("should keep the absolute frames when nothing shortens them", () => {
		const error = errorWith(
			"loader boom\n    at Object.loader (/project/loader.js:2:7)"
		);

		expect(Generator.buildErrorMessage(error)).toBe(
			"loader boom\n    at Object.loader (/project/loader.js:2:7)"
		);
	});

	it("should drop the position of a frame webpack's own files own", () => {
		const error = errorWith(
			`loader boom\n    at run (${require.resolve("../../lib/module/NormalModule")}:940:11)`
		);

		expect(Generator.buildErrorMessage(error, repositoryShortener)).toBe(
			"loader boom\n    at run (./lib/module/NormalModule.js)"
		);
	});

	it("should drop the position of a frame the engine owns", () => {
		const error = errorWith(
			"loader boom\n    at async Promise.all (node:internal/util:12:3)"
		);

		expect(Generator.buildErrorMessage(error, requestShortener)).toBe(
			"loader boom\n    at async Promise.all (node:internal/util)"
		);
	});

	it("should drop both positions a generated function carries", () => {
		const error = errorWith(
			"loader boom\n    at eval (eval at create (/project/node_modules/tapable/lib/HookCodeFactory.js:31:10), <anonymous>:139:1)"
		);

		expect(Generator.buildErrorMessage(error, requestShortener)).toBe(
			"loader boom\n    at eval (eval at create (./node_modules/tapable/lib/HookCodeFactory.js), <anonymous>)"
		);
	});
});

describe("CssGenerator.generateError", () => {
	it("should write the stack the failed module's css carries relative", () => {
		const generator = new CssGenerator(
			/** @type {EXPECTED_ANY} */ ({}),
			/** @type {EXPECTED_ANY} */ ({})
		);
		const error = Object.assign(new Error("boom"), {
			message:
				"Module build failed (from ./loader.js):\nError: css error message\n    at Object.loader (/project/loader.js:6:11)"
		});
		const source = /** @type {import("webpack-sources").Source} */ (
			generator.generateError(
				error,
				/** @type {EXPECTED_ANY} */ ({}),
				/** @type {EXPECTED_ANY} */ ({
					type: CSS_TYPE,
					runtimeTemplate: { requestShortener }
				})
			)
		)
			.source()
			.toString();

		expect(source).toBe(
			"/**\n Module build failed (from ./loader.js):\nError: css error message\n    at Object.loader (./loader.js:6:11) \n**/"
		);
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
				/** @type {EXPECTED_ANY} */ ({
					type: JAVASCRIPT_TYPE,
					runtimeTemplate: { requestShortener }
				})
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
