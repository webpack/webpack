"use strict";

const JavascriptParser = require("../lib/javascript/JavascriptParser");

/**
 * @param {string} code source
 * @param {object=} options extra parse options
 * @returns {import("../lib/javascript/JavascriptParser").ParseResult} result
 */
const parse = (code, options) =>
	JavascriptParser._parse(
		code,
		/** @type {import("../lib/javascript/JavascriptParser").InternalParseOptions} */ ({
			sourceType: "script",
			ecmaVersion: "latest",
			comments: true,
			ranges: true,
			semicolons: true,
			allowHashBang: true,
			...options
		})
	);

describe("WebpackParser", () => {
	describe("lazy comments", () => {
		it("should collect hashbang, line, block and html comments lazily", () => {
			const { comments } = parse(
				"#!/usr/bin/env node\n// line\nconst x = /* block */ 1; <!-- html\n"
			);
			expect(comments.map((c) => [c.type, c.value])).toEqual([
				["Line", "/usr/bin/env node"],
				["Line", " line"],
				["Block", " block "],
				["Line", " html"]
			]);
			expect(comments[1].range).toEqual([20, 27]);
			expect(comments[1].loc.start).toEqual({ line: 2, column: 0 });
			expect(comments[1].loc.end).toEqual({ line: 2, column: 7 });
		});

		it("should memoize and accept explicit value/loc writes", () => {
			const { comments } = parse("// abc\n");
			expect(comments[0].value).toBe(" abc");
			// memoized second read
			expect(comments[0].value).toBe(" abc");
			comments[0].value = "override";
			expect(comments[0].value).toBe("override");
			const loc = comments[0].loc;
			expect(comments[0].loc).toBe(loc);
			comments[0].loc = { start: { line: 9, column: 9 }, end: loc.end };
			expect(comments[0].loc.start.line).toBe(9);
		});

		it("should collect comments eagerly when ranges are off", () => {
			const { comments } = parse("// line\n/* block */ x;", {
				ranges: false
			});
			expect(comments.map((c) => [c.type, c.value])).toEqual([
				["Line", " line"],
				["Block", " block "]
			]);
		});

		it("should report unterminated block comments", () => {
			expect(() => parse("const x = 1; /* nope")).toThrow(
				/Unterminated comment/
			);
		});
	});

	describe("template fast path", () => {
		it("should cook CR and CRLF chunks through the cold path", () => {
			const { ast } = parse("`a\r\nb\rc`;");
			const statement =
				/** @type {import("estree").ExpressionStatement} */
				(ast.body[0]);
			const template =
				/** @type {import("estree").TemplateLiteral} */
				(statement.expression);
			const quasi = template.quasis[0];
			expect(quasi.value.cooked).toBe("a\nb\nc");
		});

		it("should report unterminated templates", () => {
			expect(() => parse("const x = `nope")).toThrow(/Unterminated template/);
			expect(() =>
				// eslint-disable-next-line no-template-curly-in-string
				parse("const x = `nope ${y} still open")
			).toThrow(/Unterminated template/);
		});
	});

	describe("regexp fast path", () => {
		it("should report unterminated regular expressions", () => {
			expect(() => parse("x = /nope")).toThrow(
				/Unterminated regular expression/
			);
			expect(() => parse("x = /new\nline/")).toThrow(
				/Unterminated regular expression/
			);
		});

		it("should report flag errors with acorn's messages", () => {
			expect(() => parse("x = /a/q")).toThrow(
				/Invalid regular expression flag/
			);
			expect(() => parse("x = /a/gg")).toThrow(
				/Duplicate regular expression flag/
			);
			expect(() => parse("x = /a/uv")).toThrow(
				/Invalid regular expression flag/
			);
			expect(() => parse("x = /a/\\u0067")).toThrow(/Unexpected token/);
		});

		it("should respect the ecmaVersion for allowed flags", () => {
			expect(() => parse("x = /a/s", { ecmaVersion: 6 })).toThrow(
				/Invalid regular expression flag/
			);
			expect(parse("x = /a/s", { ecmaVersion: 2018 }).ast).toBeDefined();
		});

		it("should report invalid patterns with V8's messages", () => {
			expect(() => parse("x = /(/")).toThrow(/Invalid regular expression/);
		});

		it("should build the literal value once", () => {
			const { ast } = parse("x = /a[/]b/gi;");
			const statement =
				/** @type {import("estree").ExpressionStatement} */
				(ast.body[0]);
			const assignment =
				/** @type {import("estree").AssignmentExpression} */
				(statement.expression);
			const literal =
				/** @type {import("estree").RegExpLiteral} */
				(assignment.right);
			expect(literal.regex).toEqual({ pattern: "a[/]b", flags: "gi" });
			expect(literal.value).toBeInstanceOf(RegExp);
			expect(/** @type {RegExp} */ (literal.value).source).toBe("a[/]b");
		});
	});
});
