"use strict";

const { fixture, fixtures } = require("../../helpers/fixture");

/** @typedef {{ type: { label: string }, value: unknown, start: number, end: number, loc?: object, range?: [number, number] }} TokenLike */
/** @typedef {Record<string, EXPECTED_ANY>} Options */
/** @typedef {{ file: string, code: string, options: Options, commonjs?: false, error?: string }} Corpus */
/** @typedef {{ file: string, code: string, options?: Options, error?: string }} RecordedCase */
/** @typedef {{ case: string, file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ case: string, file: string, webpack: string, acorn: string }} VerdictDifference */
/** @typedef {typeof import("../../../lib/javascript/syntax-parser")} ParserExports */
/** @typedef {Partial<import("../../../lib/javascript/syntax-parser").Options>} PortOptions */
/** @typedef {import("../../../lib/javascript/syntax-parser").EstreeSource} EstreeNode */
/** @typedef {import("../../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */
/** @typedef {import("../../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/**
 * A parsed node whose children may already stand as the ids they were written as.
 * @typedef {{ type: string, [key: string]: unknown }} WrittenNode
 */

// cspell:ignore ypeof averyvery ahri aafom Unsyntactic
// cspell:ignore Grek Kawi Mundari Garay Todhri Keycap aeiou gimsuyd dgimsvy
/* eslint-disable no-template-curly-in-string */

const fs = require("fs");
const os = require("os");
const path = require("path");
const acorn = require("acorn");
const JavascriptParser = require("../../../lib/javascript/JavascriptParser");
const { parse: webpackParse } = require("../../../lib/javascript/syntax").parser;
const { parse, plain } = require("../../helpers/javascriptParse");
const { Parser } = require("../../../lib/javascript/syntax-parser");

const {
	firstDifference,
	reportable
} = require("../../../tooling/compare-js-tools");

/**
 * @param {string} code source code the parser mapped
 * @returns {JavascriptParser} parser whose getLocation maps offsets in `code`
 */
const locationMapperFor = (code) => {
	const parser = new JavascriptParser("auto");
	parser._source = code;
	return parser;
};

describe("WebpackParser", () => {
	it("keeps deferred destructuring errors in lazy nodes", () => {
		expect(() => parse(fixture("javascript", "webpack-parser-keeps-deferred-destructuring-errors-in-lazy-nodes"))).toThrow(
			/Shorthand property assignments are valid only in destructuring patterns/
		);
		expect(() =>
			parse(fixture("javascript", "webpack-parser-keeps-deferred-destructuring-errors-in-lazy-nodes-2"))
		).toThrow(/Redefinition of __proto__ property/);
		expect(() =>
			parse(fixture("javascript", "webpack-parser-keeps-deferred-destructuring-errors-in-lazy-nodes-3"))
		).not.toThrow();
		expect(() => parse(fixture("javascript", "webpack-parser-keeps-deferred-destructuring-errors-in-lazy-nodes-4"))).not.toThrow();
	});

	describe("lazy comments", () => {
		it("should collect hashbang, line, block and html comments lazily", () => {
			const { comments } = parse(
				fixture("javascript", "webpack-parser-lazy-comments-should-collect-hashbang-line-block-and-html")
			);
			expect(comments.map((c) => [c.type, c.value])).toEqual([
				["Line", "/usr/bin/env node"],
				["Line", " line"],
				["Block", " block "],
				["Line", " html"]
			]);
			expect(comments[1].range).toEqual([20, 27]);
			// comments carry no `loc` — locations derive from offsets
			expect(comments[1].loc).toBeUndefined();
		});

		it("should memoize and accept explicit value writes", () => {
			const { comments } = parse(fixture("javascript", "webpack-parser-lazy-comments-should-memoize-and-accept-explicit-value-writes"));
			expect(comments[0].value).toBe(" abc");
			// memoized second read
			expect(comments[0].value).toBe(" abc");
			comments[0].value = "override";
			expect(comments[0].value).toBe("override");
			comments[0].range = [1, 2];
			expect(comments[0].range).toEqual([1, 2]);
		});

		it("should collect a hashbang when acorn's constructor skipped it", () => {
			// ranges asked for directly take the constructor that skips it early
			/** @type {CollectedComment[]} */
			const comments = [];
			webpackParse(fixture("javascript", "webpack-parser-lazy-comments-should-collect-a-hashbang-when-acorn-s-constructor"), {
				ecmaVersion: "latest",
				sourceType: "script",
				allowHashBang: true,
				lazyNodes: true,
				ranges: true,
				lazyComments: comments
			});
			expect(comments.map((c) => [c.type, c.value, c.range])).toEqual([
				["Line", "/usr/bin/env node", [0, 19]]
			]);
		});

		it("should collect comments eagerly when ranges are off", () => {
			const { comments } = parse(fixture("javascript", "webpack-parser-lazy-comments-should-collect-comments-eagerly-when-ranges-are-off"), {
				ranges: false
			});
			expect(comments.map((c) => [c.type, c.value])).toEqual([
				["Line", " line"],
				["Block", " block "]
			]);
		});

		it("should report unterminated block comments", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-lazy-comments-should-report-unterminated-block-comments"))).toThrow(
				/Unterminated comment/
			);
		});

		it("should map positions across CRLF, CR, LS and PS line breaks", () => {
			const code = fixture("javascript", "webpack-parser-lazy-comments-should-map-positions-across-crlf-cr-ls-and-ps-line");
			const { comments } = parse(code);
			const mapper = locationMapperFor(code);
			expect(
				comments.map(
					(c) =>
						/** @type {import("../../../lib/graph/Dependency").RealDependencyLocation} */
						(mapper.getLocation(c)).start
				)
			).toEqual([
				{ line: 1, column: 0 },
				{ line: 2, column: 0 },
				{ line: 3, column: 0 },
				{ line: 4, column: 0 },
				{ line: 5, column: 0 }
			]);
		});
	});

	describe("template fast path", () => {
		it("should cook CR and CRLF chunks through the cold path", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-template-fast-path-should-cook-cr-and-crlf-chunks-through-the"));
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
			expect(() => parse(fixture("javascript", "webpack-parser-template-fast-path-should-report-unterminated-templates"))).toThrow(/Unterminated template/);
			expect(() =>
				// eslint-disable-next-line no-template-curly-in-string
				parse(fixture("javascript", "webpack-parser-template-fast-path-should-report-unterminated-templates-2"))
			).toThrow(/Unterminated template/);
		});
	});

	describe("regexp fast path", () => {
		it("should report unterminated regular expressions", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-unterminated-regular-expressions"))).toThrow(
				/Unterminated regular expression/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-unterminated-regular-expressions-2"))).toThrow(
				/Unterminated regular expression/
			);
		});

		it("should report flag errors with acorn's messages", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-flag-errors-with-acorn-s-messages"))).toThrow(
				/Invalid regular expression flag/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-flag-errors-with-acorn-s-messages-2"))).toThrow(
				/Duplicate regular expression flag/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-flag-errors-with-acorn-s-messages-3"))).toThrow(
				/Invalid regular expression flag/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-flag-errors-with-acorn-s-messages-4"))).toThrow(/Unexpected token/);
		});

		it("should respect the ecmaVersion for allowed flags", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-respect-the-ecma-version-for-allowed"), { ecmaVersion: 6 })).toThrow(
				/Invalid regular expression flag/
			);
			expect(parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-respect-the-ecma-version-for-allowed"), { ecmaVersion: 2018 }).ast).toBeDefined();
		});

		it("should report invalid patterns with V8's messages", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-report-invalid-patterns-with-v8-s"))).toThrow(/Invalid regular expression/);
		});

		it("should build the literal value once", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-regexp-fast-path-should-build-the-literal-value-once"));
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

	describe("number fast path", () => {
		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {import("estree").Literal} the sole declarator's literal init
		 */
		const literal = (code, options) => {
			const declaration =
				/** @type {import("estree").VariableDeclaration} */
				(parse(code, options).ast.body[0]);
			return /** @type {import("estree").Literal} */ (
				declaration.declarations[0].init
			);
		};

		it("should read integers, decimals and bare zero on the fast path", () => {
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on")).value).toBe(0);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-2")).value).toBe(42);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-3")).value).toBe(1.5);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-4")).value).toBe(0.5);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-5")).value).toBe(100);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-6")).value).toBe(1);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-integers-decimals-and-bare-zero-on-7")).value).toBe(0.5);
		});

		it("should read radix, exponent, separator and bigint literals on the cold path", () => {
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint")).value).toBe(31);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-2")).value).toBe(15);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-3")).value).toBe(5);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-4")).value).toBe(1000);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-5")).value).toBe(1000);
			expect(literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-6")).value).toBe(1234567890123456);
			expect(typeof literal(fixture("javascript", "webpack-parser-number-fast-path-should-read-radix-exponent-separator-and-bigint-7")).value).toBe("bigint");
		});

		it("should reject an identifier directly after a number", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-number-fast-path-should-reject-an-identifier-directly-after-a"))).toThrow(
				/Identifier directly after number/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-number-fast-path-should-reject-an-identifier-directly-after-a-2"))).toThrow(
				/Identifier directly after number/
			);
		});
	});

	describe("string fast path", () => {
		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {import("estree").Literal} the sole declarator's literal init
		 */
		const literal = (code, options) => {
			const declaration =
				/** @type {import("estree").VariableDeclaration} */
				(parse(code, options).ast.body[0]);
			return /** @type {import("estree").Literal} */ (
				declaration.declarations[0].init
			);
		};

		it("should read plain strings on the fast path", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path")).value).toBe("abc");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path-2")).value).toBe("abc");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path-3")).value).toBe("");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path-4")).value).toBe('it"s');
			const lit = literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path"));
			expect(lit.raw).toBe('"abc"');
			expect(lit.range).toEqual([8, 13]);
		});

		it("should read a string ending at the end of input", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-a-string-ending-at-the-end-of-input")).value).toBe("tail");
		});

		it("should allow unescaped LS/PS in strings (ES2019+) but delegate them below ES2019", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-allow-unescaped-ls-ps-in-strings-es2019")).value).toBe("\u2028");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-allow-unescaped-ls-ps-in-strings-es2019-2")).value).toBe("\u2029");
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-allow-unescaped-ls-ps-in-strings-es2019"), { ecmaVersion: 2018 })).toThrow(
				/Unterminated string constant/
			);
			// an escape in the same string routes it through the cold reader, which
			// carries the version rule of its own
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-allow-unescaped-ls-ps-in-strings-es2019-3")).value).toBe("a\tb\u2028c");
			expect(() =>
				parse(fixture("javascript", "webpack-parser-string-fast-path-should-allow-unescaped-ls-ps-in-strings-es2019-3"), { ecmaVersion: 2018 })
			).toThrow(/Unterminated string constant/);
		});

		it("should cook the common single-char escapes", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes")).value).toBe("a\nb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-2")).value).toBe("a\tb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-3")).value).toBe("a\rb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-4")).value).toBe("a\bb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-5")).value).toBe("a\fb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-6")).value).toBe("a\u000Bb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-7")).value).toBe("a\\b");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-8")).value).toBe("it's");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-9")).value).toBe('q"q');
			// unknown escapes are the escaped char verbatim
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-10")).value).toBe("aqb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-the-common-single-char-escapes-11")).value).toBe("aéb");
		});

		it("should cook line continuations", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-line-continuations")).value).toBe("ab");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-line-continuations-2")).value).toBe("ab");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-line-continuations-3")).value).toBe("ab");
			expect(
				literal(`var x = "a\\${String.fromCharCode(0x2028)}b"`).value
			).toBe("ab");
			expect(
				literal(`var x = "a\\${String.fromCharCode(0x2029)}b"`).value
			).toBe("ab");
		});

		it("should route every escape through the cold reader", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold")).value).toBe("aAb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold-2")).value).toBe("aAb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold-3")).value).toBe("a\u{1F600}b");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold-4")).value).toBe("aAb");
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold-5")).value).toBe("a b");
			// octal in strict mode still throws through the cold reader
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-route-every-escape-through-the-cold-6"))).toThrow(
				/Octal literal in strict mode/
			);
		});

		it("should cook a string mixing owned and delegated escapes", () => {
			expect(literal(fixture("javascript", "webpack-parser-string-fast-path-should-cook-a-string-mixing-owned-and-delegated")).value).toBe("a\nA\t\\z");
		});

		it("should report a lone trailing backslash as unterminated", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-a-lone-trailing-backslash-as"))).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report a string ending after a cooked escape as unterminated", () => {
			// the escape cooks and then the cold reader's own loop meets EOF, which
			// is a different raise from the trailing backslash above
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-a-string-ending-after-a-cooked"))).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report strings broken by a line terminator", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-strings-broken-by-a-line"))).toThrow(
				/Unterminated string constant/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-strings-broken-by-a-line-2"))).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report unterminated strings", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-unterminated-strings"))).toThrow(
				/Unterminated string constant/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-string-fast-path-should-report-unterminated-strings-2"))).toThrow(/Unterminated string constant/);
		});

		it("should read strings identically when acorn tracks locations", () => {
			expect(
				literal(fixture("javascript", "webpack-parser-string-fast-path-should-read-plain-strings-on-the-fast-path"), { ranges: false, locations: true }).value
			).toBe("abc");
		});
	});

	describe("automatic semicolon insertion", () => {
		/**
		 * @param {string} code source the parser maps
		 * @param {[number, number]} current current statement range
		 * @param {[number, number]=} prev previous statement range
		 * @returns {JavascriptParser} parser positioned in `current`
		 */
		const asiParserFor = (code, current, prev) => {
			const parser = new JavascriptParser("auto");
			parser._source = code;
			parser.statementPath = [/** @type {EXPECTED_ANY} */ ({ range: current })];
			if (prev) {
				parser.prevStatement = /** @type {EXPECTED_ANY} */ ({ range: prev });
			}
			return parser;
		};

		it("should derive ASI positions from the source text", () => {
			// no real semicolon → end and (via prev) start are ASI positions
			const asi = asiParserFor(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at"), [2, 3], [0, 1]);
			expect(asi.isAsiPosition(3)).toBe(true);
			expect(asi.isAsiPosition(2)).toBe(true);
			// a real semicolon terminates the statement → not an ASI position
			const term = asiParserFor("x;\ny;", [3, 5], [0, 2]);
			expect(term.isAsiPosition(5)).toBe(false);
			expect(term.isAsiPosition(3)).toBe(false);
			// a position that is neither statement boundary is never ASI
			expect(term.isAsiPosition(4)).toBe(false);
		});

		it("should honor set/unsetAsiPosition overrides over the source", () => {
			const term = asiParserFor("x;\ny;", [3, 5]);
			// force ASI even though a real semicolon is present
			term.setAsiPosition(5);
			expect(term.isAsiPosition(5)).toBe(true);
			const asi = asiParserFor(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at"), [2, 3]);
			// force a real semicolon even though the source relies on ASI
			asi.unsetAsiPosition(3);
			expect(asi.isAsiPosition(3)).toBe(false);
		});

		it("should treat a comma-continued sequence element as non-ASI", () => {
			// the separator can trail whitespace, line and block comments
			for (const code of ["a,b", "a ,b", "a\t,b", "a//c\n,b", "a/* c */,b"]) {
				const parser = new JavascriptParser("auto");
				parser._source = code;
				expect(parser._isAsiPosition(1)).toBe(false);
			}
			// a genuine line break with no separator is an ASI position; a lone
			// slash (division) is a token, not a comment, so it stays ASI too
			for (const code of [
				fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at"),
				"a//c\nb",
				"a/* c */\nb",
				"a",
				"a/* c */",
				"a/b"
			]) {
				const parser = new JavascriptParser("auto");
				parser._source = code;
				expect(parser._isAsiPosition(1)).toBe(true);
			}
		});

		it("should look past a parenthesized element's trailing `)` for the separator", () => {
			// a parenthesized node's range excludes its wrapping parens, so the
			// `,`/`;` separator sits behind one or more `)` — still non-ASI. `pos`
			// is the end of the inner `a`, i.e. the first trailing `)`.
			for (const [code, pos] of [
				["(a),b", 2],
				["((a)),b", 3],
				["(a) ,b", 2],
				["(a);b", 2]
			]) {
				const parser = new JavascriptParser("auto");
				parser._source = /** @type {string} */ (code);
				expect(parser._isAsiPosition(/** @type {number} */ (pos))).toBe(false);
			}
		});

		it("should assume ASI when no source text is available", () => {
			const parser = new JavascriptParser("auto");
			parser.statementPath = [/** @type {EXPECTED_ANY} */ ({ range: [0, 1] })];
			expect(parser.isAsiPosition(1)).toBe(true);
		});

		it("should throw when queried outside of a statement", () => {
			const parser = new JavascriptParser("auto");
			parser.statementPath = [];
			expect(() => parser.isAsiPosition(0)).toThrow("Not in statement");
		});

		it("should keep splitting statements at ASI boundaries", () => {
			expect(parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3")).ast.body).toHaveLength(1);
			expect(parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at")).ast.body).toHaveLength(2);
			const { ast } = parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-2"), { ranges: false });
			expect(ast.body).toHaveLength(2);
		});

		it("should tokenize non-ASCII identifiers and unicode whitespace", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-tokenize-non-ascii"));
			const first =
				/** @type {import("estree").VariableDeclaration} */
				(ast.body[0]);
			expect(
				/** @type {import("estree").Identifier} */ (first.declarations[0].id)
					.name
			).toBe("π");
			expect(ast.body).toHaveLength(2);
		});
	});

	describe("reserved words and bindings", () => {
		it("should reject contextual and reserved identifiers like acorn", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved"))).toThrow(
				/Cannot use 'yield' as identifier inside a generator/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-2"))).toThrow(
				/Cannot use 'await' as identifier inside an async function/
			);
			expect(() =>
				parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-3"), { sourceType: "module" })
			).toThrow(/Cannot use 'arguments' in class field initializer/);
			expect(() =>
				parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-4"), { sourceType: "module" })
			).toThrow(/class static initialization block/);
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-5"), { sourceType: "module" })).toThrow(
				/The keyword 'enum' is reserved/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-6"))).toThrow(
				/Binding eval in strict mode/
			);
		});

		it("should allow keywords as property names", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-allow-keywords-as-property")).ast
			).toBeDefined();
		});

		it("should reject escape sequences in keywords like acorn", () => {
			// the owned `next` keyword-escape guard fires when a keyword token
			// carries a `\uXXXX` escape
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-escape-sequences-in"))).toThrow(
				/Escape sequence in keyword if/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-escape-sequences-in-2"))).toThrow(
				/Escape sequence in keyword typeof/
			);
			// `liberal` idents (keyword as property name) pass `ignore`, so an
			// escaped keyword is allowed there
			expect(parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-escape-sequences-in-3")).ast).toBeDefined();
		});

		it("should allow await as a sloppy-mode identifier", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-allow-await-as-a-sloppy-mode"));
			const declaration =
				/** @type {import("estree").VariableDeclaration} */
				(ast.body[0]);
			expect(
				/** @type {import("estree").Identifier} */ (
					declaration.declarations[0].id
				).name
			).toBe("await");
		});

		it("should detect redeclarations and undefined exports", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-detect-redeclarations-and"))).toThrow(
				/Identifier 'x' has already been declared/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-detect-redeclarations-and-2"))).toThrow(/already been declared/);
			expect(parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-detect-redeclarations-and-3")).ast).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-detect-redeclarations-and-4"), { sourceType: "module" })).toThrow(
				/Export 'x' is not defined/
			);
			expect(
				parse(fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-detect-redeclarations-and-5"), { sourceType: "module" }).ast
			).toBeDefined();
		});
	});

	describe("identifier word cache", () => {
		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {string[]} every Identifier name in program order
		 */
		const names = (code, options) => {
			/** @type {string[]} */
			const found = [];
			JSON.stringify(parse(code, options).ast, (_key, value) => {
				if (value && value.type === "Identifier") found.push(value.name);
				return value;
			});
			return found;
		};

		it("should return identical names for repeated, uncached and long identifiers", () => {
			// repeated words hit the cache; 1-char and >12-char words bypass it
			expect(names(fixture("javascript", "webpack-parser-identifier-word-cache-should-return-identical-names-for-repeated"))).toEqual([
				"foo",
				"foo",
				"f",
				"averyveryLongIdentifier"
			]);
		});

		it("should read identifiers written with a unicode escape", () => {
			// a `\\` classifies with the non-ASCII chars, so `nextToken` reaches the
			// escape-aware cold reader through `readToken` rather than directly
			expect(names(fixture("javascript", "webpack-parser-identifier-word-cache-should-read-identifiers-written-with-a"))).toEqual([
				"abc",
				"abc",
				"ax"
			]);
			// and the same word read plainly is the same name
			expect(names(fixture("javascript", "webpack-parser-identifier-word-cache-should-read-identifiers-written-with-a-2"))).toEqual(["abc", "abc"]);
		});

		it("should reclassify a cached word for a second keyword set", () => {
			// `abstract` is an ordinary name under a recent ecmaVersion and reserved
			// under ES3, so each parse retypes the slot the one before it typed
			const code = fixture("javascript", "webpack-parser-identifier-word-cache-should-reclassify-a-cached-word-for-a");
			expect(names(code)).toEqual(["abstract"]);
			expect(() => parse(code, { ecmaVersion: 3, allowReserved: false })).toThrow(
				/'abstract' is reserved/
			);
			expect(names(code)).toEqual(["abstract"]);
		});

		it("should survive hash collisions by content check", () => {
			// `aaaa`/`ahri` and `aaaa`/`aafom` share a cache slot (same djb2&mask),
			// exercising the same-length and length-mismatch collision branches
			expect(names(fixture("javascript", "webpack-parser-identifier-word-cache-should-survive-hash-collisions-by-content"))).toEqual([
				"aaaa",
				"ahri",
				"aaaa",
				"aafom",
				"aaaa"
			]);
		});

		it("should serve multi-char operators as static strings", () => {
			// repeated occurrences reuse one string per operator; sizes 1-4
			const { ast } = parse(
				fixture("javascript", "webpack-parser-identifier-word-cache-should-serve-multi-char-operators-as-static")
			);
			const ops = ast.body.map(
				(s) =>
					/** @type {{ expression: { operator: string } }} */ (
						/** @type {unknown} */ (s)
					).expression.operator
			);
			expect(ops).toEqual(["<", "<<", "<<=", "===", "===", ">>>=", "&&="]);
		});
	});

	describe("expression atoms", () => {
		it("should parse keyword literals and this on the fast path", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-expression-atoms-should-parse-keyword-literals-and-this-on-the"));
			expect(
				ast.body.map(
					(s) =>
						/** @type {import("estree").ExpressionStatement} */ (s).expression
							.type
				)
			).toEqual(["ThisExpression", "Literal", "Literal", "Literal", "Literal"]);
			const literal =
				/** @type {import("estree").Literal} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[1])
						.expression
				);
			expect(literal.raw).toBe("true");
			expect(literal.value).toBe(true);
		});

		it("should parse async function expressions and async arrows", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-expression-atoms-should-parse-async-function-expressions-and")).ast
			).toBeDefined();
			expect(
				parse(fixture("javascript", "webpack-parser-expression-atoms-should-parse-async-function-expressions-and-2")).ast
			).toBeDefined();
			// ASI keeps `async` a plain identifier, so the arrow is unexpected
			expect(() => parse(fixture("javascript", "webpack-parser-expression-atoms-should-parse-async-function-expressions-and-3"))).toThrow(/Unexpected token/);
		});
	});

	describe("statements", () => {
		it("should parse declarations, blocks and expression statements", () => {
			const { ast } = parse(
				fixture("javascript", "webpack-parser-statements-should-parse-declarations-blocks-and-expression")
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"VariableDeclaration",
				"BlockStatement",
				"ExpressionStatement",
				"ForStatement"
			]);
			const declaration = /** @type {import("estree").VariableDeclaration} */ (
				ast.body[0]
			);
			expect(declaration.kind).toBe("var");
			expect(
				declaration.declarations.map((d) => d.init && d.init.type)
			).toEqual(["Literal", null]);
		});

		it("should parse if/else chains and returns on the fast path", () => {
			const { ast } = parse(
				fixture("javascript", "webpack-parser-statements-should-parse-if-else-chains-and-returns-on-the-fast")
			);
			const ifStatement = /** @type {import("estree").IfStatement} */ (
				ast.body[0]
			);
			expect(ifStatement.type).toBe("IfStatement");
			expect(
				/** @type {import("estree").IfStatement} */ (ifStatement.alternate).type
			).toBe("IfStatement");
			// the script-mode helper allows top-level return; module mode doesn't
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-parse-if-else-chains-and-returns-on-the-fast-2"), { sourceType: "module" })).toThrow(
				/'return' outside of function/
			);
		});

		it("should keep acorn's declaration checks", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-keep-acorn-s-declaration-checks"))).toThrow(/Unexpected token/);
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-keep-acorn-s-declaration-checks-2"))).toThrow(
				/Complex binding patterns require an initialization value/
			);
			expect(
				parse(fixture("javascript", "webpack-parser-statements-should-keep-acorn-s-declaration-checks-3")).ast
			).toBeDefined();
		});

		it("should dispatch let declarations and let-as-identifier like acorn", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-statements-should-dispatch-let-declarations-and-let-as-identifier"));
			expect(ast.body.map((s) => s.type)).toEqual([
				"VariableDeclaration",
				"ExpressionStatement",
				"ExpressionStatement",
				"ExpressionStatement"
			]);
			expect(
				/** @type {import("estree").VariableDeclaration} */ (ast.body[0]).kind
			).toBe("let");
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-dispatch-let-declarations-and-let-as-identifier-2"))).toThrow(/Unexpected token/);
			// `let [` is the one head where isLet stays true in statement position
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-dispatch-let-declarations-and-let-as-identifier-3"))).toThrow(/Unexpected token/);
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-dispatch-let-declarations-and-let-as-identifier-4"))).toThrow(/Unexpected token/);
		});

		it("should parse labeled statements through acorn's tail", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-statements-should-parse-labeled-statements-through-acorn-s-tail"));
			expect(ast.body.map((s) => s.type)).toEqual([
				"LabeledStatement",
				"LabeledStatement"
			]);
			const labeled = /** @type {import("estree").LabeledStatement} */ (
				ast.body[0]
			);
			expect(labeled.label.name).toBe("outer");
			expect(labeled.range).toEqual([0, 32]);
			expect(() => parse(fixture("javascript", "webpack-parser-statements-should-parse-labeled-statements-through-acorn-s-tail-2"))).toThrow(/Unsyntactic break/);
		});

		it("should delegate async, using and await statement heads to acorn", () => {
			const { ast } = parse(
				fixture("javascript", "webpack-parser-statements-should-delegate-async-using-and-await-statement-heads")
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"FunctionDeclaration",
				"ExpressionStatement",
				"ExpressionStatement"
			]);
			const { ast: moduleAst } = parse(fixture("javascript", "webpack-parser-statements-should-delegate-async-using-and-await-statement-heads-2"), { sourceType: "module" });
			expect(moduleAst.body[0].type).toBe("ExpressionStatement");
		});

		it("should parse if and return through acorn without ranges", () => {
			const { ast } = parse(
				fixture("javascript", "webpack-parser-statements-should-parse-if-and-return-through-acorn-without"),
				{ ranges: false }
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"FunctionDeclaration",
				"IfStatement"
			]);
		});

		it("should delegate rare statement heads to acorn", () => {
			const { ast } = parse(
				fixture("javascript", "webpack-parser-statements-should-delegate-rare-statement-heads-to-acorn"),
				{ ecmaVersion: 2019 }
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"DoWhileStatement",
				"SwitchStatement",
				"TryStatement",
				"WithStatement",
				"DebuggerStatement",
				"EmptyStatement"
			]);
		});

		it("should keep the statement fast path off for parser plugins overriding statement parsers", () => {
			const { WebpackParser } = require("../../../lib/javascript/syntax-parser");

			let calls = 0;
			class Plugin extends WebpackParser {
				/**
				 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} node started statement node
				 * @returns {import("../../../lib/javascript/syntax-parser").NodeOf<"IfStatement">} if statement
				 */
				parseIfStatement(node) {
					calls++;
					return super.parseIfStatement(node);
				}

				/**
				 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} node started statement node
				 * @returns {import("../../../lib/javascript/syntax-parser").NodeOf<"ReturnStatement">} return statement
				 */
				parseReturnStatement(node) {
					calls++;
					return super.parseReturnStatement(node);
				}
			}
			const code = fixture("javascript", "webpack-parser-statements-should-keep-the-statement-fast-path-off-for-parser");
			const ast = Plugin.parse(
				code,
				/** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
					/** @type {unknown} */ ({
						ecmaVersion: "latest",
						sourceType: "script",
						lazyNodes: true
					})
				)
			);
			expect(calls).toBe(2);
			expect(ast.body.map((s) => s.type)).toEqual([
				"IfStatement",
				"VariableDeclaration",
				"FunctionDeclaration"
			]);
		});
	});

	describe("conditional, new, array and template atoms", () => {
		it("should parse them on the single-shape fast paths", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-parse-them-on-the"));
			expect(
				ast.body.map(
					(s) =>
						/** @type {import("estree").ExpressionStatement} */ (s).expression
							.type
				)
			).toEqual([
				"ConditionalExpression",
				"NewExpression",
				"NewExpression",
				"ArrayExpression"
			]);
			const template =
				/** @type {import("estree").TemplateLiteral} */
				(
					/** @type {import("estree").ExpressionStatement} */ (
						// eslint-disable-next-line no-template-curly-in-string
						parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-parse-them-on-the-2")).ast.body[0]
					).expression
				);
			expect(template.quasis.map((q) => q.value.raw)).toEqual(["a", "b"]);
			expect(template.quasis[1].tail).toBe(true);
		});

		it("should keep acorn's new.target and template escape checks", () => {
			expect(parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-keep-acorn-s-new")).ast).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-keep-acorn-s-new-2"))).toThrow(
				/'new\.target' can only be used in functions/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-keep-acorn-s-new-3"))).toThrow(
				/Bad escape sequence in untagged template literal/
			);
			const tagged =
				/** @type {import("estree").TaggedTemplateExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (
						parse(fixture("javascript", "webpack-parser-conditional-new-array-and-template-atoms-should-keep-acorn-s-new-4")).ast.body[0]
					).expression
				);
			expect(tagged.quasi.quasis[0].value.cooked).toBeNull();
		});
	});

	describe("unary and update expressions", () => {
		it("should parse prefix and postfix operators on the fast path", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-unary-and-update-expressions-should-parse-prefix-and-postfix"));
			expect(
				ast.body
					.slice(0, 3)
					.map(
						(s) =>
							/** @type {import("estree").ExpressionStatement} */ (s).expression
								.type
					)
			).toEqual(["UnaryExpression", "UpdateExpression", "UpdateExpression"]);
		});

		it("should keep acorn's delete and exponentiation checks", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-unary-and-update-expressions-should-keep-acorn-s-delete-and"))).toThrow(
				/Deleting local variable in strict mode/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-unary-and-update-expressions-should-keep-acorn-s-delete-and-2"))).toThrow(
				/Private fields can not be deleted/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-unary-and-update-expressions-should-keep-acorn-s-delete-and-3"))).toThrow(/Unexpected token/);
			expect(() => parse(fixture("javascript", "webpack-parser-unary-and-update-expressions-should-keep-acorn-s-delete-and-4"))).toThrow(/Assigning to rvalue/);
		});
	});

	describe("assignment expressions", () => {
		it("should parse destructuring, chained and compound assignments", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-assignment-expressions-should-parse-destructuring-chained-and")).ast
			).toBeDefined();
			const { ast } = parse(fixture("javascript", "webpack-parser-assignment-expressions-should-parse-destructuring-chained-and-2"));
			const chained =
				/** @type {import("estree").AssignmentExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
						.expression
				);
			expect(chained.right.type).toBe("AssignmentExpression");
			expect(parse(fixture("javascript", "webpack-parser-assignment-expressions-should-parse-destructuring-chained-and-3")).ast).toBeDefined();
		});

		it("should reject invalid assignment targets", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-assignment-expressions-should-reject-invalid-assignment-targets"))).toThrow(/Assigning to rvalue/);
			expect(() => parse(fixture("javascript", "webpack-parser-assignment-expressions-should-reject-invalid-assignment-targets-2"))).toThrow(/Assigning to rvalue/);
		});
	});

	describe("binary expressions", () => {
		it("should keep private-in checks and delegate without ranges", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-binary-expressions-should-keep-private-in-checks-and-delegate")).ast
			).toBeDefined();
			// a private name only reaches buildBinary's right side via a chain
			expect(() =>
				parse(fixture("javascript", "webpack-parser-binary-expressions-should-keep-private-in-checks-and-delegate-2"))
			).toThrow(/Private identifier can only be left side/);
			const { ast } = parse(fixture("javascript", "webpack-parser-binary-expressions-should-keep-private-in-checks-and-delegate-3"), { ranges: false });
			expect(
				/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
					.expression.type
			).toBe("LogicalExpression");
		});

		it("should climb operator precedence like acorn", () => {
			/**
			 * @param {string} code source
			 * @returns {import("estree").Expression} the sole expression
			 */
			const expression = (code) =>
				/** @type {import("estree").ExpressionStatement} */ (
					parse(code).ast.body[0]
				).expression;
			const sum = /** @type {import("estree").BinaryExpression} */ (
				expression(fixture("javascript", "webpack-parser-binary-expressions-should-climb-operator-precedence-like-acorn"))
			);
			// ((1 + (2 * 3)) - 4): the same-precedence loop keeps left-association
			expect(sum.operator).toBe("-");
			const add = /** @type {import("estree").BinaryExpression} */ (sum.left);
			expect(add.operator).toBe("+");
			expect(add.right.type).toBe("BinaryExpression");
			expect(sum.range).toEqual([0, 13]);
			const coalesce = /** @type {import("estree").LogicalExpression} */ (
				expression(fixture("javascript", "webpack-parser-binary-expressions-should-climb-operator-precedence-like-acorn-2"))
			);
			expect(coalesce.operator).toBe("??");
			expect(coalesce.left.type).toBe("LogicalExpression");
			const exponent = /** @type {import("estree").BinaryExpression} */ (
				expression(fixture("javascript", "webpack-parser-binary-expressions-should-climb-operator-precedence-like-acorn-3"))
			);
			// `**` is right-associative via the recursive right-side climb
			expect(exponent.right.type).toBe("BinaryExpression");
		});

		it("should reject mixing ?? with && and || like acorn", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-binary-expressions-should-reject-mixing-with-and-like-acorn"))).toThrow(/cannot be mixed/);
			expect(() => parse(fixture("javascript", "webpack-parser-binary-expressions-should-reject-mixing-with-and-like-acorn-2"))).toThrow(/cannot be mixed/);
		});

		it("should not read `in` as an operator in for-init position", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-binary-expressions-should-not-read-in-as-an-operator-in-for-init"));
			expect(ast.body[0].type).toBe("ForInStatement");
			expect(
				/** @type {import("estree").ExpressionStatement} */ (
					parse(fixture("javascript", "webpack-parser-binary-expressions-should-not-read-in-as-an-operator-in-for-init-2")).ast.body[0]
				).expression.type
			).toBe("AssignmentExpression");
		});
	});

	describe("destructuring-errors record pool", () => {
		it("should keep raising expression errors from pooled records", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-destructuring-errors-record-pool-should-keep-raising-expression"))).toThrow(
				/Shorthand property assignments are valid only in destructuring patterns/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-destructuring-errors-record-pool-should-keep-raising-expression-2"))).toThrow(
				/Shorthand property assignments are valid only in destructuring patterns/
			);
		});

		it("should parse nested own-record expressions and async arrows", () => {
			expect(parse(fixture("javascript", "webpack-parser-destructuring-errors-record-pool-should-parse-nested-own-record")).ast).toBeDefined();
			expect(parse(fixture("javascript", "webpack-parser-destructuring-errors-record-pool-should-parse-nested-own-record-2")).ast).toBeDefined();
			const { ast } = parse(fixture("javascript", "webpack-parser-destructuring-errors-record-pool-should-parse-nested-own-record-3"));
			const assignment =
				/** @type {import("estree").AssignmentExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
						.expression
				);
			expect(assignment.right.type).toBe("ArrowFunctionExpression");
		});
	});

	describe("expressions, spreads and parameter checks", () => {
		it("should parse comma sequences and spreads with ranges", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-parse-comma"));
			const sequence =
				/** @type {import("estree").SequenceExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
						.expression
				);
			expect(sequence.type).toBe("SequenceExpression");
			expect(sequence.expressions).toHaveLength(3);
			expect(sequence.range).toEqual([0, 7]);
			const call =
				/** @type {import("estree").CallExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[1])
						.expression
				);
			expect(call.arguments[0].type).toBe("SpreadElement");
			expect(call.arguments[0].range).toEqual([11, 18]);
			// non-lazy mode delegates to acorn
			expect(parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-parse-comma-2"), { ranges: false }).ast).toBeDefined();
		});

		it("should report stack overflow on pathological nesting like acorn", () => {
			expect(() => parse(`${"(".repeat(100000)}x`)).toThrow(
				/Not enough stack space to parse input/
			);
			// statements alone nest past any expression's own catch
			expect(() => parse("{".repeat(100000))).toThrow(
				/Not enough stack space to parse input/
			);
		});

		it("should check identifier parameter lists like acorn", () => {
			// sloppy simple functions allow duplicates; arrows and strict don't
			expect(parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-check-identifier")).ast).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-check-identifier-2"))).toThrow(/Argument name clash/);
			expect(() => parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-check-identifier-3"))).toThrow(
				/Argument name clash/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-check-identifier-4"))).toThrow(
				/Binding eval in strict mode/
			);
		});

		it("should delegate pattern parameters to acorn's full walk", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-delegate-pattern"))
					.ast
			).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-delegate-pattern-2"))).toThrow(/Argument name clash/);
		});
	});

	describe("subscript parsing", () => {
		it("should parse optional chains, private members and tagged templates", () => {
			expect(
				// eslint-disable-next-line no-template-curly-in-string
				parse(fixture("javascript", "webpack-parser-subscript-parsing-should-parse-optional-chains-private-members")).ast
			).toBeDefined();
			expect(
				parse(fixture("javascript", "webpack-parser-subscript-parsing-should-parse-optional-chains-private-members-2")).ast
			).toBeDefined();
		});

		it("should reject optional chaining in new callees and template tags", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-subscript-parsing-should-reject-optional-chaining-in-new-callees"))).toThrow(
				/Optional chaining cannot appear in the callee/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-subscript-parsing-should-reject-optional-chaining-in-new-callees-2"))).toThrow(
				/Optional chaining cannot appear in the tag/
			);
		});

		it("should parse async arrows through the call subscript path", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-subscript-parsing-should-parse-async-arrows-through-the-call")).ast
			).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-subscript-parsing-should-parse-async-arrows-through-the-call-2"))).toThrow(
				/Cannot use 'await' as identifier inside an async function/
			);
		});

		it("should delegate to acorn without ranges and pre-2020 ecmaVersions", () => {
			expect(parse(fixture("javascript", "webpack-parser-subscript-parsing-should-delegate-to-acorn-without-ranges-and-pre"), { ranges: false }).ast).toBeDefined();
			const { ast } = parse(fixture("javascript", "webpack-parser-subscript-parsing-should-delegate-to-acorn-without-ranges-and-pre-2"), { ecmaVersion: 10 });
			const call =
				/** @type {import("estree").CallExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
						.expression
				);
			// acorn only adds `optional` from ecmaVersion 11 on
			expect("optional" in call.callee).toBe(false);
		});
	});

	describe("punctuator fast path", () => {
		it("should tokenize the single-char punctuators into the right AST", () => {
			const program = parse(fixture("javascript", "webpack-parser-punctuator-fast-path-should-tokenize-the-single-char-punctuators")).ast;
			const call =
				/** @type {import("estree").CallExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (program.body[0])
						.expression
				);
			expect(call.type).toBe("CallExpression");
			expect(call.arguments).toHaveLength(3);
			expect(call.arguments[1].type).toBe("ArrayExpression");
			expect(call.arguments[2].type).toBe("ObjectExpression");
		});

		it("should keep ranges aligned across punctuator-dense code", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-punctuator-fast-path-should-keep-ranges-aligned-across-punctuator"));
			const { range } = /** @type {{ range: [number, number] }} */ (
				/** @type {unknown} */ (ast.body[0])
			);
			expect(range).toEqual([0, 7]);
		});
	});

	describe("owned operator scanner", () => {
		/**
		 * @param {string} code source with one expression statement
		 * @returns {string} the expression's operator
		 */
		const op = (code) =>
			/** @type {{ expression: { operator: string } }} */ (
				/** @type {unknown} */ (parse(code).ast.body[0])
			).expression.operator;

		it("should scan every multi-char operator to its exact string", () => {
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to"))).toBe("/=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-2"))).toBe("%=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-3"))).toBe("%");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-4"))).toBe("**=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-5"))).toBe("**");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-6"))).toBe("*=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-7"))).toBe("||=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-8"))).toBe("||");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-9"))).toBe("|=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-10"))).toBe("|");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-11"))).toBe("&&=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-12"))).toBe("&&");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-13"))).toBe("&=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-14"))).toBe("&");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-15"))).toBe("^=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-16"))).toBe("^");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-17"))).toBe("++");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-18"))).toBe("+=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-19"))).toBe("+");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-20"))).toBe("--");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-21"))).toBe("-=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-22"))).toBe("-");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-23"))).toBe("<<=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-24"))).toBe("<<");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-25"))).toBe("<=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-26"))).toBe("<");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-27"))).toBe(">>>=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-28"))).toBe(">>>");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-29"))).toBe(">>=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-30"))).toBe(">>");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-31"))).toBe(">=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-32"))).toBe(">");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-33"))).toBe("===");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-34"))).toBe("==");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-35"))).toBe("!==");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-36"))).toBe("!=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-37"))).toBe("!");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-38"))).toBe("~");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-39"))).toBe("??=");
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-every-multi-char-operator-to-40"))).toBe("??");
		});

		it("should scan ?., conditional ? and ?. before a digit", () => {
			const chain =
				/** @type {{ expression: import("estree").ChainExpression }} */ (
					/** @type {unknown} */ (parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-conditional-and-before-a-digit")).ast.body[0])
				).expression;
			expect(chain.type).toBe("ChainExpression");
			// `?.` directly before a digit is a conditional, not optional chaining
			const conditional =
				/** @type {{ expression: import("estree").Expression }} */ (
					/** @type {unknown} */ (parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-conditional-and-before-a-digit-2")).ast.body[0])
				).expression;
			expect(conditional.type).toBe("ConditionalExpression");
			expect(
				/** @type {{ expression: import("estree").Expression }} */ (
					/** @type {unknown} */ (parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-scan-conditional-and-before-a-digit-3")).ast.body[0])
				).expression.type
			).toBe("ConditionalExpression");
		});

		it("should dispatch radix numbers, strings, templates and privates", () => {
			const values = parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-dispatch-radix-numbers-strings"));
			const array = /** @type {{ init: import("estree").ArrayExpression }} */ (
				/** @type {{ declarations: unknown[] }} */ (
					/** @type {unknown} */ (values.ast.body[0])
				).declarations[0]
			).init;
			expect(
				array.elements.map(
					(e) => /** @type {import("estree").Literal} */ (e).value
				)
			).toEqual([255, 15, 3, 0, "d", "s"]);
			expect(parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-dispatch-radix-numbers-strings-2")).ast).toBeDefined();
			expect(
				parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-dispatch-radix-numbers-strings-3")).ast
			).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-dispatch-radix-numbers-strings-4"))).toThrow(/Unexpected character/);
		});

		it("should read a lone dot after a dot as a plain dot token", () => {
			// `..` misses the ellipsis check and lands on the plain-dot tail
			expect(() => parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-read-a-lone-dot-after-a-dot-as-a"))).toThrow(/Unexpected token/);
		});

		it("should keep single-char tails for direct getTokenFromCode calls", () => {
			// unreachable from the dispatch fast path (nextToken finishes plain
			// `=`/`.` itself) but part of the getTokenFromCode contract
			const { tokTypes } = require("../../../lib/javascript/syntax-parser");
			const { WebpackParser } = require("../../../lib/javascript/syntax-parser");

			const source = "= .";
			const parser = new WebpackParser(
				/** @type {EXPECTED_ANY} */ ({
					ecmaVersion: "latest",
					lazyNodes: true
				}),
				source
			);
			/** @type {EXPECTED_ANY} */ (parser).getTokenFromCode(61);
			expect(/** @type {EXPECTED_ANY} */ (parser).type).toBe(tokTypes.eq);
			expect(/** @type {EXPECTED_ANY} */ (parser).value).toBe("=");
			/** @type {EXPECTED_ANY} */ (parser).pos = 2;
			/** @type {EXPECTED_ANY} */ (parser).getTokenFromCode(46);
			expect(/** @type {EXPECTED_ANY} */ (parser).type).toBe(tokTypes.dot);
		});

		it("should read the inlined HTML comment forms", () => {
			// `<!--` opens a line comment in script mode only
			const script = parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-read-the-inlined-html-comment-forms"));
			expect(script.comments.map((c) => c.value)).toEqual(["y"]);
			const module_ = parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-read-the-inlined-html-comment-forms-2"), { sourceType: "module" });
			expect(module_.comments).toHaveLength(0);
			// `-->` after a line break is a comment; `a-->b` stays `(a--) > b`
			const close = parse(fixture("javascript", "webpack-parser-owned-operator-scanner-should-read-the-inlined-html-comment-forms-3"));
			expect(close.comments.map((c) => c.value)).toEqual([" rest"]);
			expect(op(fixture("javascript", "webpack-parser-owned-operator-scanner-should-read-the-inlined-html-comment-forms-4"))).toBe(">");
		});
	});

	describe("keyword and reserved-word gates", () => {
		/**
		 * @param {string} code source with one expression statement
		 * @returns {string} the expression's operator
		 */
		const op = (code) =>
			/** @type {{ expression: { operator: string } }} */ (
				/** @type {unknown} */ (parse(code).ast.body[0])
			).expression.operator;

		it("should classify keywords and near-keywords correctly", () => {
			expect(op(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-classify-keywords-and-near"))).toBe("instanceof");
			expect(op(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-classify-keywords-and-near-2"))).toBe("in");
			// same length/lowercase shape as keywords, but not keywords
			expect(parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-classify-keywords-and-near-3")).ast).toBeDefined();
			// capitalized, single-char, and >10-char words skip the keyword probe
			expect(
				parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-classify-keywords-and-near-4")).ast.body
			).toHaveLength(4);
		});

		it("should still reject reserved words through the gate", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-still-reject-reserved"))).toThrow(
				/The keyword 'enum' is reserved/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-still-reject-reserved-2"))).toThrow(
				/The keyword 'implements' is reserved/
			);
			expect(parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-still-reject-reserved-3")).ast).toBeDefined();
			expect(() => parse(fixture("javascript", "webpack-parser-keyword-and-reserved-word-gates-should-still-reject-reserved-4"))).toThrow(/Unexpected keyword 'if'/);
		});
	});

	describe("object literals and patterns (single-shape nodes)", () => {
		it("should parse every property kind onto the fixed Property shape", () => {
			const { ast } = parse(
				"({ m() {}, get g() { return 1; }, set g(v) {}, async af() {}, " +
					'*gen() {}, [k]: 1, "s": 2, 3: 3, sh, ...sp });'
			);
			const properties =
				/** @type {{ expression: import("estree").ObjectExpression }} */ (
					/** @type {unknown} */ (ast.body[0])
				).expression.properties;
			expect(
				properties.map((p) =>
					p.type === "Property"
						? [p.kind, p.method, p.shorthand, p.computed]
						: p.type
				)
			).toEqual([
				["init", true, false, false],
				["get", false, false, false],
				["set", false, false, false],
				["init", true, false, false],
				["init", true, false, false],
				["init", false, false, true],
				["init", false, false, false],
				["init", false, false, false],
				["init", false, true, false],
				"SpreadElement"
			]);
		});

		it("should parse object patterns with defaults and rest", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-parse"));
			const pattern = /** @type {{ id: import("estree").ObjectPattern }} */ (
				/** @type {{ declarations: unknown[] }} */ (
					/** @type {unknown} */ (ast.body[0])
				).declarations[0]
			).id;
			expect(pattern.type).toBe("ObjectPattern");
			expect(pattern.properties.map((p) => p.type)).toEqual([
				"Property",
				"Property",
				"Property",
				"RestElement"
			]);
			// assignment-destructuring converts the same nodes via toAssignable
			expect(parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-parse-2")).ast).toBeDefined();
		});

		it("should parse trailing commas and record-less objects", () => {
			expect(parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-parse-3")).ast).toBeDefined();
			// no destructuring-errors record flows in through `typeof`
			expect(parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-parse-4")).ast).toBeDefined();
		});

		it("should keep acorn's property error checks", () => {
			expect(() => parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn"))).toThrow(
				/Comma is not permitted after the rest element/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn-2"))).toThrow(
				/Comma is not permitted after the rest element/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn-3"))).toThrow(
				/Redefinition of __proto__ property/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn-4"))).toThrow(
				/Shorthand property assignments are valid only in destructuring/
			);
			expect(() => parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn-5"))).toThrow(/getter/);
		});

		it("should delegate object parsing without ranges", () => {
			const { ast } = parse(fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-delegate"), { ranges: false });
			const properties =
				/** @type {{ expression: import("estree").ObjectExpression }} */ (
					/** @type {unknown} */ (ast.body[0])
				).expression.properties;
			expect(properties.map((p) => p.type)).toEqual([
				"Property",
				"SpreadElement",
				"Property"
			]);
		});
	});

	describe("auto source type module->script fallback", () => {
		const { WebpackParser } = require("../../../lib/javascript/syntax-parser");

		/**
		 * The retry as a script after a failed module parse is `_parse`'s own, so
		 * this block alone goes through it rather than the syntax parser.
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {import("../../../lib/javascript/JavascriptParser").ParseResult} result
		 */
		const parseThroughJavascriptParser = (code, options) =>
			JavascriptParser._parse(
				code,
				/** @type {import("../../../lib/javascript/JavascriptParser").InternalParseOptions} */ ({
					sourceType: "auto",
					ecmaVersion: "latest",
					comments: true,
					ranges: true,
					allowHashBang: true,
					...options
				})
			);

		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {{ ast: import("../../../lib/javascript/JavascriptParser").ParseResult["ast"], parses: number }} result and acorn parse count
		 */
		const parseAuto = (code, options) => {
			const proto =
				/** @type {{ parse: () => unknown }} */
				(/** @type {unknown} */ (WebpackParser.prototype));
			const spy = jest.spyOn(proto, "parse");
			try {
				const { ast } = parseThroughJavascriptParser(code, options);
				return { ast, parses: spy.mock.calls.length };
			} finally {
				spy.mockRestore();
			}
		};

		it("should downgrade a top-level return in a single parse (fast path)", () => {
			const { ast, parses } = parseAuto(
				fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-downgrade-a-top")
			);
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("script");
			expect(ast.body[0].type).toBe("IfStatement");
		});

		it("should downgrade a bare top-level return without ranges", () => {
			const { ast, parses } = parseAuto(fixture("javascript", "webpack-parser-statements-should-parse-if-else-chains-and-returns-on-the-fast-2"), { ranges: false });
			expect(parses).toBe(1);
			expect(ast.body[0].type).toBe("ReturnStatement");
		});

		it("should produce the same AST as an explicit script parse", () => {
			const code = fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-produce-the-same");
			const strip = (/** @type {unknown} */ node) =>
				JSON.stringify(node, (k, v) =>
					k === "loc" || k === "start" || k === "end" || k === "range"
						? undefined
						: v
				);
			expect(strip(parseAuto(code).ast)).toBe(
				strip(parse(code, { sourceType: "script" }).ast)
			);
		});

		it("should single-parse a top-level return past an async function's await", () => {
			// the await is function-scoped, not module syntax, so the downgrade still applies
			const { parses, ast } = parseAuto(
				fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-single-parse-a-top")
			);
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("script");
		});

		it("should keep esm a single module parse", () => {
			const { ast, parses } = parseAuto(fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-keep-esm-a-single"));
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("module");
			expect(ast.body[0].type).toBe("ExportNamedDeclaration");
		});

		it.each([
			[fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-not-downgrade-when"), "import"],
			[fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-not-downgrade-when-2"), "export"],
			[fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-not-downgrade-when-3"), "top-level await"],
			[fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-not-downgrade-when-4"), fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite")]
		])(
			"should not downgrade when %s precedes the return (module syntax seen)",
			(code) => {
				const proto =
					/** @type {{ parse: () => unknown }} */
					(/** @type {unknown} */ (WebpackParser.prototype));
				const spy = jest.spyOn(proto, "parse");
				expect(() => parseThroughJavascriptParser(code)).toThrow(
					/'return' outside of function/
				);
				const parses = spy.mock.calls.length;
				spy.mockRestore();
				// module syntax before the return blocks the in-place downgrade, so
				// the outer double-parse still runs and re-throws the module error
				expect(parses).toBe(2);
			}
		);

		it("should not downgrade a return inside a class static block", () => {
			expect(() =>
				parseThroughJavascriptParser(fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-not-downgrade-a"))
			).toThrow(/'return' outside of function/);
		});

		it("should still fall back to script for strict-only syntax", () => {
			// `with` is not handled by the in-place switch; the outer retry covers it
			const { ast, parses } = parseAuto(
				fixture("javascript", "webpack-parser-auto-source-type-module-script-fallback-should-still-fall-back-to")
			);
			expect(parses).toBe(2);
			expect(ast.body[0].type).toBe("WithStatement");
		});
	});

	describe("import phases (owned defer/source parsing)", () => {
		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {import("../../../lib/javascript/JavascriptParser").ParseResult["ast"]["body"][0]} first statement
		 */
		const first = (code, options) =>
			parse(code, { sourceType: "module", importPhases: true, ...options }).ast
				.body[0];

		it("should tag `import defer` and `import source` declarations with a phase", () => {
			expect(first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-tag-import-defer"))).toMatchObject({
				type: "ImportDeclaration",
				phase: "defer"
			});
			expect(first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-tag-import-defer-2"))).toMatchObject({
				type: "ImportDeclaration",
				phase: "source"
			});
		});

		it("should treat defer/source as the default name when followed by `from` or a comma", () => {
			const deferName =
				/** @type {import("estree").ImportDeclaration & { phase?: string }} */
				(first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-treat-defer")));
			expect(deferName.phase).toBeUndefined();
			expect(deferName.specifiers[0].type).toBe("ImportDefaultSpecifier");
			const withNamed =
				/** @type {import("estree").ImportDeclaration} */
				(first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-treat-defer-2")));
			expect(withNamed.specifiers.map((s) => s.type)).toEqual([
				"ImportDefaultSpecifier",
				"ImportSpecifier"
			]);
		});

		it("should reject phase modifiers on the wrong specifier shape", () => {
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-phase"))).toThrow(
				/'import defer' can only be used with namespace imports/
			);
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-phase-2"))).toThrow(
				/'import source' can only be used with direct identifier specifier imports/
			);
			// a defer/source default name may only be followed by `* as`/`{…}`
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-phase-3"))).toThrow(
				/Unexpected token/
			);
			// a source phase rejects named specifiers after the default import
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-phase-4"))).toThrow(
				/'import source' can only be used with direct identifier specifier imports/
			);
		});

		it("should parse `import.defer()` / `import.source()` dynamic imports with a phase", () => {
			const declarationFor = (/** @type {string} */ code) =>
				/** @type {import("estree").ImportExpression & { phase?: string }} */
				(
					/** @type {import("estree").VariableDeclaration} */ (first(code))
						.declarations[0].init
				);
			expect(declarationFor(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-parse-import"))).toMatchObject({
				type: "ImportExpression",
				phase: "defer"
			});
			expect(declarationFor(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-parse-import-2"))).toMatchObject({
				type: "ImportExpression",
				phase: "source"
			});
		});

		it("should reject a phase meta-property that is not a dynamic import", () => {
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-a-phase"))).toThrow(
				/'import\.defer' can only be used in a dynamic import/
			);
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-reject-a-phase-2"))).toThrow(
				/import call cannot be the target of `new`/
			);
		});

		it("should keep acorn's import.meta checks under owned parsing", () => {
			expect(first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s"))).toMatchObject({
				type: "VariableDeclaration"
			});
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s-2"))).toThrow(
				/only valid meta property for import is 'import\.meta'/
			);
			expect(() => first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s-3"))).toThrow(
				/'import\.meta' must not contain escaped characters/
			);
			expect(() =>
				first(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s"), { sourceType: "script" })
			).toThrow(/Cannot use 'import\.meta' outside a module/);
		});

		it("should delegate import.meta and specifiers to acorn when phases are off", () => {
			expect(
				parse(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s"), {
					sourceType: "module",
					importPhases: false
				}).ast.body[0].type
			).toBe("VariableDeclaration");
			expect(
				parse(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-delegate-import"), {
					sourceType: "module",
					importPhases: false
				}).ast.body[0].type
			).toBe("ImportDeclaration");
		});

		it("should locate the `import` of import.meta when acorn tracks locations", () => {
			for (const importPhases of [true, false]) {
				const declaration =
					/** @type {import("estree").VariableDeclaration} */ (
						parse(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-keep-acorn-s"), {
							sourceType: "module",
							importPhases,
							locations: true
						}).ast.body[0]
					);
				const meta = /** @type {import("estree").MetaProperty} */ (
					declaration.declarations[0].init
				);
				expect(meta.meta.loc).toEqual({
					start: { line: 1, column: 10 },
					end: { line: 1, column: 16 }
				});
			}
		});

		it("should locate phase names and phased imports when acorn tracks locations", () => {
			/** @type {ParserOptions} */
			const options = {
				ecmaVersion: "latest",
				sourceType: "module",
				locations: true
			};
			// `defer` and `source` as default names are plain imports to acorn too
			const names = fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-locate-phase");
			expect(
				plain(webpackParse(names, { ...options, importPhases: true }))
			).toEqual(
				plain(
					acorn.parse(names, /** @type {acorn.Options} */ (options))
				)
			);
			const program = webpackParse(fixture("javascript", "webpack-parser-import-phases-owned-defer-source-parsing-should-locate-phase-2"), {
				...options,
				importPhases: true
			});
			expect(
				program.body.map((statement) => {
					const { expression } =
						/** @type {import("estree").ExpressionStatement} */ (statement);
					const call =
						expression.type === "AssignmentExpression"
							? expression.right
							: expression;
					return [call.type, call.loc];
				})
			).toEqual([
				[
					"ImportExpression",
					{ start: { line: 1, column: 4 }, end: { line: 1, column: 21 } }
				],
				[
					"ImportExpression",
					{ start: { line: 2, column: 0 }, end: { line: 2, column: 18 } }
				]
			]);
		});
	});

	describe("import attributes (owned with/assert clause)", () => {
		/**
		 * @param {string} code source
		 * @returns {import("estree").ImportDeclaration} the import declaration
		 */
		const importDeclaration = (code) =>
			/** @type {import("estree").ImportDeclaration} */
			(parse(code, { sourceType: "module" }).ast.body[0]);

		it("should parse `with` and legacy `assert` attribute clauses", () => {
			expect(
				importDeclaration(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-parse-with-and")).type
			).toBe("ImportDeclaration");
			expect(
				importDeclaration(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-parse-with-and-2")).type
			).toBe("ImportDeclaration");
			expect(importDeclaration(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-parse-with-and-3")).type).toBe(
				"ImportDeclaration"
			);
			expect(
				importDeclaration(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-parse-with-and-4")).type
			).toBe("ImportDeclaration");
		});

		it("should read `assert` only as the legacy keyword it is", () => {
			// cspell:ignore ssert
			// A call on the next line is a statement of its own.
			const { body } = parse(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-read-assert"), {
				sourceType: "module"
			}).ast;
			expect(body.map((statement) => statement.type)).toEqual([
				"ImportDeclaration",
				"ExpressionStatement"
			]);
			expect(() =>
				parse(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-read-assert-2"), {
					sourceType: "module"
				})
			).toThrow(/Unexpected token/);
		});

		it("should reject a duplicate attribute key", () => {
			expect(() =>
				parse(fixture("javascript", "webpack-parser-import-attributes-owned-with-assert-clause-should-reject-a"), {
					sourceType: "module"
				})
			).toThrow(/Duplicate attribute key 'type'/);
		});
	});
});

describe("WebpackParser acorn-override fast-path gates", () => {
	const { WebpackParser } = require("../../../lib/javascript/syntax-parser");

	/** @type {import("../../../lib/javascript/syntax-parser").Options} */
	const lazyOptions =
		/** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
			/** @type {unknown} */ ({
				ecmaVersion: "latest",
				sourceType: "script",
				lazyNodes: true
			})
		);

	it("keeps the function fast path off for plugins overriding its inlined methods", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} node function node
			 * @returns {void}
			 */
			initFunction(node) {
				calls++;
				return super.initFunction(node);
			}

			/**
			 * @param {import("../../../lib/javascript/syntax-parser").Pattern[]} params parameter nodes
			 * @returns {boolean} whether all params are plain identifiers
			 */
			isSimpleParamList(params) {
				calls++;
				return super.isSimpleParamList(params);
			}
		}
		const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-the-function-fast-path-off");
		const ast = Plugin.parse(code, lazyOptions);
		expect(calls).toBeGreaterThan(0);
		expect(ast.body.map((s) => s.type)).toEqual([
			"FunctionDeclaration",
			"VariableDeclaration"
		]);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, lazyOptions))
		);
	});

	it("keeps dynamically dispatched overrides working on the function fast path", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} node function node
			 * @param {boolean} allowDuplicates whether duplicate params are allowed
			 * @returns {void}
			 */
			checkParams(node, allowDuplicates) {
				calls++;
				return super.checkParams(node, allowDuplicates);
			}
		}
		Plugin.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-dynamically-dispatched"), lazyOptions);
		expect(calls).toBeGreaterThan(0);
	});

	it("keeps the statement-head fast path off for plugins overriding those parsers", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} node started statement node
			 * @returns {import("../../../lib/javascript/syntax-parser").NodeOf<"ForStatement" | "ForInStatement" | "ForOfStatement">} for statement
			 */
			parseForStatement(node) {
				calls++;
				return super.parseForStatement(node);
			}
		}
		const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-the-statement-head-fast-path");
		const ast = Plugin.parse(code, lazyOptions);
		expect(calls).toBe(1);
		expect(ast.body.map((s) => s.type)).toEqual([
			"ForStatement",
			"WhileStatement"
		]);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, lazyOptions))
		);
	});

	it("parses the statement-head edge arcs identically to acorn", () => {
		// multiple-default switch is a SyntaxError
		expect(() =>
			WebpackParser.parse(
				fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parses-the-statement-head-edge"),
				lazyOptions
			)
		).toThrow(/Multiple default clauses/);
		// param-less catch (ES2019) parses
		const catchAst = WebpackParser.parse(
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parses-the-statement-head-edge-2"),
			lazyOptions
		);
		expect(
			/** @type {EXPECTED_ANY} */ (catchAst.body[0]).handler.param
		).toBeNull();
		// for-await outside async context is rejected
		expect(() =>
			WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parses-the-statement-head-edge-3"), lazyOptions)
		).toThrow(/Unexpected token/);
		// labeled loops resolve break/continue through the shared label records
		const labeled = WebpackParser.parse(
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parses-the-statement-head-edge-4"),
			lazyOptions
		);
		expect(labeled.body[0].type).toBe("LabeledStatement");
		expect(() => WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parses-the-statement-head-edge-5"), lazyOptions)).toThrow(
			/Unsyntactic break/
		);
	});

	it("serves the strict-bind probe from the Set stand-in and its .test fallback", () => {
		const strictOptions =
			/** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
				/** @type {unknown} */ ({
					ecmaVersion: "latest",
					sourceType: "module",
					lazyNodes: true
				})
			);
		expect(() => WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-serves-the-strict-bind-probe-from"), strictOptions)).toThrow(
			/Assigning to eval in strict mode/
		);
		// a runtime-replaced reservedWordsStrictBind takes the .test() fallback
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").Options} options parser options
			 * @param {string} input source code
			 * @param {number=} startPos start position
			 */
			constructor(options, input, startPos) {
				super(options, input, startPos);
				/** @type {{ reservedWordsStrictBind: { test: (name: string) => boolean } }} */ (
					/** @type {unknown} */ (this)
				).reservedWordsStrictBind = {
					test: (/** @type {string} */ name) => name === "customBad"
				};
			}
		}
		expect(() =>
			Plugin.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-serves-the-strict-bind-probe-from-2"), lazyOptions)
		).toThrow(/Assigning to customBad in strict mode/);
		expect(() =>
			Plugin.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-serves-the-strict-bind-probe-from-3"), lazyOptions)
		).not.toThrow();
	});

	it("keeps list-producer overrides working with the scratch pool", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @template T
			 * @param {T} item paren item
			 * @returns {T} paren item
			 */
			parseParenItem(item) {
				calls++;
				return item;
			}
		}
		const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-list-producer-overrides");
		const ast = Plugin.parse(code, lazyOptions);
		expect(calls).toBeGreaterThan(0);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, lazyOptions))
		);
	});

	describe("parenthesized expression lists", () => {
		/** @type {import("acorn").Options} */
		const referenceOptions = { ecmaVersion: "latest", sourceType: "script" };

		it("does not copy lists for single parenthesized expressions", () => {
			const code = "(((first))); second + ((third)); ((fourth));";
			const parser = new WebpackParser(lazyOptions, code);
			const releaseScratch = jest.spyOn(parser, "_releaseScratch");
			const ast = parser.parse();
			expect(releaseScratch).toHaveBeenCalledTimes(1);
			expect(releaseScratch).toHaveBeenCalledWith(
				expect.any(Array),
				ast.body.length
			);
			expect(parser._arrDepth).toBe(0);
			expect(
				firstDifference(ast, acorn.parse(code, referenceOptions), "program")
			).toBeNull();
		});

		it.each([
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-2"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-3"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-4"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-5"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-6"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-7"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-8"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-9"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-10"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-11"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-12")
		])("preserves the AST for %s", (code) => {
			for (const preserveParens of [false, true]) {
				const options = { ...lazyOptions, preserveParens };
				expect(
					firstDifference(
						WebpackParser.parse(code, options),
						acorn.parse(code, { ...referenceOptions, preserveParens }),
						"program"
					)
				).toBeNull();
			}
		});

		it.each([
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-13"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-14"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-15"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-16"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-17"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-18"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-19"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-20"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-21"),
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-22")
		])("preserves the error for %s", (code) => {
			/** @type {SyntaxError | undefined} */
			let expectedError;
			try {
				acorn.parse(code, referenceOptions);
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
				expectedError = error;
			}
			expect(expectedError).toBeInstanceOf(SyntaxError);
			expect(() => WebpackParser.parse(code, lazyOptions)).toThrow(
				expectedError
			);
		});

		it("gives arrow hooks independent lists that survive pool reuse", () => {
			/** @type {(import("../../../lib/javascript/syntax-parser").Expression | import("../../../lib/javascript/syntax-parser").Pattern)[][]} */
			const lists = [];
			class Plugin extends WebpackParser {
				/**
				 * @param {(import("../../../lib/javascript/syntax-parser").Expression | import("../../../lib/javascript/syntax-parser").Pattern)[]} expressions parenthesized expressions
				 * @returns {boolean} whether an arrow body may follow
				 */
				shouldParseArrow(expressions) {
					lists.push(expressions);
					return super.shouldParseArrow(expressions);
				}
			}
			const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-23");
			expect(
				firstDifference(
					Plugin.parse(code, lazyOptions),
					acorn.parse(code, referenceOptions),
					"program"
				)
			).toBeNull();
			expect(
				lists.map((list) =>
					list.map((node) =>
						/** @type {import("estree").Identifier} */ (node).name
					)
				)
			).toEqual([["first"], ["second"], ["third"], ["fourth", "fifth"]]);
		});

		it("honors changes to a list made by an arrow hook", () => {
			class Plugin extends WebpackParser {
				/**
				 * @param {(import("../../../lib/javascript/syntax-parser").Expression | import("../../../lib/javascript/syntax-parser").Pattern)[]} expressions parenthesized expressions
				 * @returns {boolean} whether an arrow body may follow
				 */
				shouldParseArrow(expressions) {
					expressions.push(expressions[0]);
					return false;
				}
			}
			const ast = Plugin.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-parenthesized-expression-lists-24"), lazyOptions);
			const expression = /** @type {import("estree").SequenceExpression} */ (
				/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
					.expression
			);
			expect(expression.type).toBe("SequenceExpression");
			expect(expression.expressions).toHaveLength(2);
			expect(expression.expressions[0]).toBe(expression.expressions[1]);
		});
	});

	it("keeps the token fast path off for plugins overriding tokenizer internals", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").TokenType} prevType previous token type
			 * @returns {void}
			 */
			updateContext(prevType) {
				calls++;
				return super.updateContext(prevType);
			}
		}
		// non-lazy: the extended fast token loop must gate off for the override
		const tokens = [
			...Plugin.tokenizer(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-the-token-fast-path-off-for"), {
				ecmaVersion: "latest",
				sourceType: "script"
			})
		];
		expect(calls).toBeGreaterThan(0);
		expect(tokens.length).toBeGreaterThan(5);
	});

	it("allows an expression after a closing paren at the root context", () => {
		/**
		 * @param {string} code source
		 * @returns {string[]} every token's type label in order
		 */
		const labels = (code) =>
			[
				...WebpackParser.tokenizer(code, {
					ecmaVersion: "latest",
					sourceType: "script"
				})
			].map((token) => token.type.label);
		// the root context has nothing to pop, so `)` leaves an expression allowed
		// and the `/` after it opens a regexp rather than dividing
		expect(labels(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-allows-an-expression-after-a"))).toEqual([")", "regexp"]);
		expect(labels(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-allows-an-expression-after-a-2"))).toEqual(["name", "/", "name", "/", "name"]);
	});

	it("finishes an unmatched closing paren before the parser rejects it", () => {
		// the token's context hook runs while tokenizing, so the root context is
		// left expecting an expression and only then does the parser refuse it
		expect(() => parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-finishes-an-unmatched-closing"))).toThrow(/Unexpected token/);
		expect(() => parse(fixture("javascript", "webpack-parser-token-context-finish-token-expr-allowed-should-classify-braces-as-4"))).toThrow(/Unexpected token/);
	});

	it("keeps the delegated tokenizer cold paths reachable with the fast loop off", () => {
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").TokenType} prevType previous token type
			 * @returns {void}
			 */
			updateContext(prevType) {
				return super.updateContext(prevType);
			}
		}
		// with the fast loop off acorn's own readToken_* family runs, so the
		// multi-char operators land in the owned finishOp and the comments in
		// the owned skipSpace's cold delegate
		const code =
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-the-delegated-tokenizer-cold");
		const values = [
			...Plugin.tokenizer(code, {
				ecmaVersion: "latest",
				sourceType: "script"
			})
		].map((token) => /** @type {EXPECTED_ANY} */ (token).value);
		expect(values).toContain("===");
		expect(values).toContain(">>>=");
		expect(values).toContain("??=");
		expect(values).toContain(">>>");
		expect(values).toContain("**");
	});

	it("runs the inlined token-context hooks when finishToken is overridden", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").TokenType} type token type
			 * @param {string=} value token value
			 * @returns {void}
			 */
			finishToken(type, value) {
				calls++;
				return super.finishToken(type, value);
			}
		}
		// the override only disables the inline token finisher, so every token
		// now takes the owned finishToken and its inlined updateContext arcs
		const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-runs-the-inlined-token-context");
		const ast = Plugin.parse(code, lazyOptions);
		expect(calls).toBeGreaterThan(10);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, lazyOptions))
		);
	});

	it("reads private names through readWord1's cache and cold reader", () => {
		// private names are the one word production that still goes through
		// acorn's readWord1 (the owned readWord serves every other identifier)
		const ast = WebpackParser.parse(
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-reads-private-names-through-read"),
			lazyOptions
		);
		expect(ast.body[0].type).toBe("ClassDeclaration");
		expect(() =>
			WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-reads-private-names-through-read-2"), lazyOptions)
		).toThrow(
			/Private field '#missing' must be declared in an enclosing class/
		);
	});

	it("executes no base parser prototype code on the lazy path", () => {
		// every method and accessor on the base parser's prototype is counted
		// while a feature-rich module parses lazily
		const { Parser } = require("../../../lib/javascript/syntax-parser");

		const source = [
			"#!/usr/bin/env node",
			"import def, { a as b } from 'm'; import * as ns from 'n';",
			"export const answer = 42; export default class Widget extends ns.Base {",
			"\tstatic #count = 0; #label; static { Widget.#count = 0; }",
			// eslint-disable-next-line no-template-curly-in-string
			"\tconstructor() { super(); this.#label = `w${Widget.#count++}`; }",
			"\tget label() { return this.#label; } async *walk([x = 1, ...rest] = []) {",
			"\t\tlab: for (const item of rest) { if (item ?? x) { yield (await item) ** 2; continue lab; } }",
			"\t}",
			"}",
			"export { answer as 'the answer' } ;",
			"async function main() { const res = await ns.open?.(); do main(res); while (false); }",
			"let { p, q: [r = /re?g/gu] = [] } = ns, s = 0b101 + 1_000n;",
			fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-2"),
			"await ns.ready;"
		].join("\n");
		const options = /** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
			/** @type {unknown} */ ({
				ecmaVersion: "latest",
				sourceType: "module",
				lazyNodes: true,
				lazyComments: [],
				allowHashBang: true,
				allowReturnOutsideFunction: false
			})
		);
		// warm the construction-shape cache before instrumenting
		WebpackParser.parse(source, options);
		const proto = /** @type {EXPECTED_ANY} */ (Parser.prototype);
		/** @type {string[]} */
		const hits = [];
		/** @type {[string, PropertyDescriptor][]} */
		const originals = [];
		for (const name of Object.getOwnPropertyNames(proto)) {
			if (name === "constructor") continue;
			const descriptor =
				/** @type {PropertyDescriptor} */
				(Object.getOwnPropertyDescriptor(proto, name));
			originals.push([name, descriptor]);
			if (typeof descriptor.value === "function") {
				const original = descriptor.value;
				Object.defineProperty(proto, name, {
					...descriptor,
					/**
					 * @param {...EXPECTED_ANY} args original arguments
					 * @returns {EXPECTED_ANY} original result
					 */
					value(...args) {
						hits.push(name);
						return original.apply(this, args);
					}
				});
			} else if (descriptor.get) {
				const original = descriptor.get;
				Object.defineProperty(proto, name, {
					...descriptor,
					get() {
						hits.push(`get ${name}`);
						return original.call(this);
					}
				});
			}
		}
		try {
			WebpackParser.parse(source, options);
		} finally {
			for (const [name, descriptor] of originals) {
				Object.defineProperty(proto, name, descriptor);
			}
		}
		expect(hits).toEqual([]);
	});

	it("builds fast- and slow-constructed parsers with one field layout", () => {
		// the fast construction path replicates the base constructor, so its key
		// order and option keys must match a super()-built one
		const { defaultOptions } = require("../../../lib/javascript/syntax-parser");

		const fast = /** @type {EXPECTED_ANY} */ (
			new WebpackParser(lazyOptions, "let x = 1;")
		);
		const slowOptions =
			/** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
				/** @type {unknown} */ (
					// present-but-undefined checkPrivateFields fails the fast gate
					{
						.../** @type {EXPECTED_ANY} */ (lazyOptions),
						checkPrivateFields: undefined
					}
				)
			);
		const slow = /** @type {EXPECTED_ANY} */ (
			new WebpackParser(slowOptions, "let x = 1;")
		);
		expect(Object.keys(fast)).toEqual(Object.keys(slow));
		expect(Object.keys(fast.options)).toEqual(Object.keys(defaultOptions));
		expect(JSON.stringify(WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-builds-fast-and-slow-constructed"), lazyOptions))).toBe(
			JSON.stringify(WebpackParser.parse(fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-builds-fast-and-slow-constructed"), slowOptions))
		);
	});

	it("keeps the class fast path off for plugins overriding element names", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @param {import("../../../lib/javascript/syntax-parser").UnfinishedNode} element class element node
			 * @returns {void}
			 */
			parseClassElementName(element) {
				calls++;
				return super.parseClassElementName(element);
			}
		}
		const code =
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-the-class-fast-path-off-for");
		const ast = Plugin.parse(code, lazyOptions);
		expect(calls).toBeGreaterThan(0);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, lazyOptions))
		);
	});

	it("keeps dynamic dispatch working through the owned module declarations", () => {
		let calls = 0;
		class Plugin extends WebpackParser {
			/**
			 * @returns {import("../../../lib/javascript/syntax-parser").ImportSpecifier} import specifier
			 */
			parseImportSpecifier() {
				calls++;
				return super.parseImportSpecifier();
			}
		}
		const moduleOptions =
			/** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
				/** @type {unknown} */ ({
					ecmaVersion: "latest",
					sourceType: "module",
					lazyNodes: true
				})
			);
		const code = fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-keeps-dynamic-dispatch-working");
		const ast = /** @type {EXPECTED_ANY} */ (Plugin.parse(code, moduleOptions));
		expect(calls).toBe(2);
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify(WebpackParser.parse(code, moduleOptions))
		);
	});

	describe("releaseParserCaches", () => {
		const {
			WebpackParser: CacheParser,
			releaseParserCaches
		} = require("../../../lib/javascript/syntax-parser");

		const options = /** @type {import("../../../lib/javascript/syntax-parser").Options} */ (
			/** @type {unknown} */ ({
				ecmaVersion: "latest",
				sourceType: "module",
				lazyNodes: true,
				locations: false,
				ranges: false
			})
		);
		const code =
			fixture("javascript", "webpack-parser-acorn-override-fast-path-gates-release-parser-caches-parses");

		it("parses identically after the caches are released", () => {
			const before = JSON.stringify(CacheParser.parse(code, options));
			releaseParserCaches();
			const after = JSON.stringify(CacheParser.parse(code, options));
			expect(after).toBe(before);
		});

		it("is registered on the compiler's done and failed hooks", () => {
			const { AsyncSeriesHook, SyncHook } = require("tapable");
			const JavascriptModulesPlugin = require("../../../lib/javascript/JavascriptModulesPlugin");

			// tap targets mirror lib/Compiler.js hook types
			const compiler = {
				hooks: {
					done: new AsyncSeriesHook(["stats"]),
					failed: new SyncHook(["error"]),
					afterEmit: new AsyncSeriesHook(["compilation"]),
					compilation: new SyncHook(["compilation", "params"])
				}
			};
			new JavascriptModulesPlugin().apply(
				/** @type {EXPECTED_ANY} */ (compiler)
			);
			// the plugin taps the exported function itself, so identity proves
			// the release really runs on both lifecycle ends
			expect(compiler.hooks.done.taps.map((tap) => tap.fn)).toContain(
				releaseParserCaches
			);
			expect(compiler.hooks.failed.taps.map((tap) => tap.fn)).toContain(
				releaseParserCaches
			);
			compiler.hooks.failed.call(new Error("test"));
		});

		it("is idempotent and keeps the tokenizer working", () => {
			releaseParserCaches();
			releaseParserCaches();
			let count = 0;
			for (const token of CacheParser.tokenizer(code, {
				ecmaVersion: "latest",
				sourceType: "module"
			})) {
				if (token) count++;
			}
			expect(count).toBeGreaterThan(10);
		});
	});

	describe("acorn boundary", () => {
		// Either quote style, and the name must end there: a sibling package like
		// `acorn-import-phases` is not the dependency this boundary is about.
		const ACORN_REQUIRE_REGEXP = /\brequire\s*\(\s*["']acorn["'/]/;

		// webpack owns the parser, so importing acorn anywhere in lib is a regression.
		it("keeps acorn out of every lib file", () => {
			const dir = path.resolve(__dirname, "../../../lib");
			/** @type {string[]} */
			const offenders = [];
			/**
			 * @param {string} directory directory to scan
			 */
			const walk = (directory) => {
				for (const entry of fs.readdirSync(directory, {
					withFileTypes: true
				})) {
					const file = path.join(directory, entry.name);
					if (entry.isDirectory()) {
						walk(file);
					} else if (entry.name.endsWith(".js")) {
						const relative = path.relative(dir, file).replace(/\\/g, "/");
						if (ACORN_REQUIRE_REGEXP.test(fs.readFileSync(file, "utf8"))) {
							offenders.push(relative);
						}
					}
				}
			};
			walk(dir);
			expect(offenders).toEqual([]);
		});
	});
});

// webpack's JavaScript parser is a port of acorn, so acorn's own test suite is
// the corpus it owes the same answers on. What each case expects comes from
// acorn itself, parsed side by side below.

const CORPUS_FILE = path.resolve(__dirname, "../../fixtures/acorn-corpus.json");
const ACORN_VERSION = require("acorn/package.json").version;
// acorn ships no tests in its npm tarball, so the corpus is vendored. Refresh
// it by cloning acorn at this version here, then re-running this file with
// WEBPACK_UPDATE_ACORN_CORPUS=1 set.
const ACORN_CHECKOUT = path.resolve(
	__dirname,
	"../../../node_modules/.cache",
	`acorn-${ACORN_VERSION}`
);

const corpus = /** @type {{ acornVersion: string, cases: Corpus[] }} */ (
	JSON.parse(fs.readFileSync(CORPUS_FILE, "utf8"))
);

// Options acorn's own driver reads rather than passes on: they pick which of
// its parsers a case runs under, so only the commonjs filter survives here.
const DRIVER_OPTIONS = new Set(["loose", "commonjs"]);
// Options whose value is a callback, which no vendored corpus can carry.
const CALLBACK_OPTIONS = new Set(["onInsertedSemicolon", "onTrailingComma"]);
// Options acorn's driver hands an array of expectations and reads back after
// the parse. The corpus records that the case asked for them, not what it
// expected, because the run below diffs both parsers' output instead.
const COLLECTOR_OPTIONS = new Set(["onComment", "onToken"]);

/**
 * Load every `tests*.js` of an acorn checkout against a driver that records
 * each case instead of running it. Each file runs as the script it is, against
 * a `require` of this module's own, because a source checkout has no built
 * entry point for the one test file that reads token types off it.
 * @param {string} tests the checkout's `test` directory
 * @returns {RecordedCase[]} every case, in upstream order
 */
const collectAcornCases = (tests) => {
	/** @type {RecordedCase[]} */
	const cases = [];
	let file = "";
	const driver = {
		/**
		 * @param {string} code the source
		 * @param {EXPECTED_ANY} _ast the tree acorn expects, which this file takes from acorn itself instead
		 * @param {Options=} options what the case parses with
		 * @returns {void}
		 */
		test: (code, _ast, options) => {
			cases.push({ file, code, options });
		},
		/**
		 * @param {string} code the source
		 * @param {string} error the message acorn expects, `~`-prefixed when only a substring
		 * @param {Options=} options what the case parses with
		 * @returns {void}
		 */
		testFail: (code, error, options) => {
			cases.push({ file, code, options, error });
		},
		/**
		 * @param {string} code the source
		 * @param {(ast: EXPECTED_ANY) => string | null} _assert what upstream asserts over the tree, which no corpus can carry
		 * @param {Options=} options what the case parses with
		 * @returns {void}
		 */
		testAssert: (code, _assert, options) => {
			cases.push({ file, code, options });
		}
	};

	/**
	 * @param {string} request what the test file asked for
	 * @returns {EXPECTED_ANY} the driver, or the acorn it reads token types from
	 */
	const resolve = (request) =>
		request.endsWith("driver.js") ? driver : acorn;

	for (const entry of fs.readdirSync(tests).sort()) {
		if (!/^tests.*\.js$/.test(entry)) continue;
		file = entry;
		const source = fs.readFileSync(path.join(tests, entry), "utf8");
		// eslint-disable-next-line no-new-func
		new Function("require", "exports", "module", source)(resolve, {}, {});
	}

	return cases;
};

/**
 * One case as the corpus records it: the source, the options that survive
 * vendoring, and acorn's own verdict.
 * @param {RecordedCase} testCase what the driver recorded
 * @returns {Corpus} the corpus entry
 */
const corpusEntryOf = ({ file, code, options, error }) => {
	/** @type {Options} */
	const kept = {};

	for (const [name, value] of Object.entries(options || { locations: true })) {
		if (CALLBACK_OPTIONS.has(name)) continue;
		if (COLLECTOR_OPTIONS.has(name)) {
			kept[name] = true;
			continue;
		}
		if (!DRIVER_OPTIONS.has(name)) kept[name] = value;
	}
	// acorn's driver parses at ES5 wherever a case named no version.
	if (!kept.ecmaVersion) kept.ecmaVersion = 5;

	/** @type {Corpus} */
	const entry = { file, code, options: kept };

	// `sourceType: "commonjs"` is a second goal symbol acorn runs its script
	// cases under; a case that opts out says so where the run below reads it.
	if (options && options.commonjs === false) entry.commonjs = false;
	if (error !== undefined) entry.error = error;

	return entry;
};

/**
 * The corpus as it is written: one case per line, so a refreshed corpus diffs
 * as the cases that moved.
 * @param {string} version the acorn the cases came from
 * @param {Corpus[]} entries every case
 * @returns {string} the file's contents
 */
const renderCorpus = (version, entries) =>
	[
		"{",
		`"acornVersion": ${JSON.stringify(version)},`,
		'"cases": [',
		entries.map((entry) => JSON.stringify(entry)).join(",\n"),
		"]",
		"}",
		""
	].join("\n");

// Every case is parsed by both parsers, and coverage instrumentation makes the
// parser several times slower, so jest's default 30s is too tight.
const CORPUS_TIMEOUT = 300000;

// The two entry points into webpack's parser: the subclass every build runs,
// and the ported base it specializes. Both owe acorn the same trees; only the
// first hands a regexp literal to the host engine before validating it, and
// only it reads the lazy-node and syntax-tree switches.
/** @type {[string, (code: string, options: Options) => EXPECTED_ANY, boolean, boolean][]} */
const PARSERS = [
	[
		"the parser a build runs",
		(code, options) => {
			if (!options.syntaxTree) {
				return webpackParse(code, /** @type {ParserOptions} */ (options));
			}
			const { SyntaxTree, WebpackParser } = require(
				"../../../lib/javascript/syntax-parser"
			);
			const tree = new SyntaxTree();
			const program = new WebpackParser(
				/** @type {EXPECTED_ANY} */ ({ ...options, syntaxTree: tree }),
				code
			).parse();
			return tree.estree(/** @type {number} */ (/** @type {unknown} */ (program)));
		},
		true,
		true
	],
	[
		"the ported base parser",
		(code, options) => Parser.parse(code, options),
		false,
		false
	]
];

// What is asked on top of the options each case carries. Ranges, locations and
// the two collectors are off in most of acorn's cases, and turning them on is
// what reaches webpack's lazy nodes and its own comment and token bookkeeping.
// The last three are a build's own: lazy nodes carry offsets alone, the latest
// edition reaches the productions webpack owns rather than delegates, and a
// syntax tree is written where an object would be built (acorn ignores both).
// A lazy parse reports no tokens and collects comments into `lazyComments`.
const LAZY = {
	lazyNodes: true,
	locations: false,
	onComment: undefined,
	onToken: undefined
};
/** @type {[string, Options, boolean][]} */
const MODES = [
	["as acorn's own suite runs them", {}, false],
	[
		"with ranges, locations, comments and tokens",
		{ ranges: true, locations: true, onComment: true, onToken: true },
		false
	],
	["as commonjs", { sourceType: "commonjs" }, false],
	["lazily, as a build parses", { ...LAZY, ranges: true }, true],
	[
		"lazily, at the latest edition",
		{ ...LAZY, ranges: true, ecmaVersion: "latest" },
		true
	],
	[
		"into a syntax tree, at the latest edition",
		{ ...LAZY, ecmaVersion: "latest", syntaxTree: true },
		true
	]
];

// How deep input may nest before a parser gives up is the runtime's answer,
// not the parser's — JavaScriptCore reaches the depth acorn recorded on
// neither side. The phrase is what a thrown message and that record share.
const STACK_LIMIT = "Not enough stack space";

/**
 * @param {string=} verdict a parse verdict, or acorn's recorded expectation
 * @returns {boolean} whether it is a parser running out of stack
 */
const isStackDepth = (verdict) =>
	verdict !== undefined && verdict.includes(STACK_LIMIT);

/**
 * Whether this host's own `RegExp` built every pattern in a tree, and there was
 * one to build.
 * @param {EXPECTED_ANY} node a node of the tree webpack returned
 * @returns {boolean} whether the engine read them all
 */
const engineBuiltEveryRegExp = (node) => {
	let seen = 0;
	let built = 0;

	/**
	 * @param {EXPECTED_ANY} value anything a node holds
	 * @returns {void}
	 */
	const walk = (value) => {
		if (value === null || typeof value !== "object") return;
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}
		if (value.type === "Literal" && value.regex !== undefined) {
			seen++;
			if (value.value instanceof RegExp) built++;
			return;
		}
		for (const key of Object.keys(value)) walk(value[key]);
	};

	walk(node);

	return seen > 0 && seen === built;
};

// WHY: the parser a build runs hands a regexp literal to the host engine and
// re-reads it with the ported validator only where the engine refused it, so a
// pattern this engine builds is taken as written whatever `ecmaVersion` says.
// Which patterns those are is the running V8's answer, not a list — a newer one
// reads more of them, so the tree it built is what the exemption asks.
/**
 * Whether acorn's stricter answer is the one webpack's engine-backed regexp
 * validation is documented to decline to give.
 * @param {EXPECTED_ANY} ours the tree webpack built, or undefined when it threw
 * @param {string=} theirs acorn's verdict
 * @returns {boolean} whether the disagreement is that contract
 */
const isEngineValidated = (ours, theirs) =>
	ours !== undefined &&
	theirs !== undefined &&
	theirs.startsWith("Invalid regular expression:") &&
	engineBuiltEveryRegExp(ours);

/**
 * A token as both parsers describe one: their `TokenType` instances are
 * different objects of different classes, so the label stands in for the type.
 * @param {TokenLike} token the token either parser reported
 * @returns {object} what the comparison reads
 */
const tokenShape = (token) => ({
	type: token.type.label,
	value: token.value,
	start: token.start,
	end: token.end,
	loc: token.loc,
	range: token.range
});

/**
 * The options one case is parsed with, and where its comments and tokens land.
 * @param {Corpus} testCase the case
 * @param {Options} mode what the run asks on top of it
 * @param {object[]} comments where comments are collected
 * @param {TokenLike[]} tokens where tokens are collected
 * @returns {Options} the options both parsers are handed
 */
const optionsFor = (testCase, mode, comments, tokens) => {
	const options = { ...testCase.options, ...mode };
	if (options.onComment) options.onComment = comments;
	if (options.onToken) options.onToken = tokens;
	return options;
};

/**
 * Whether a case is one acorn also runs under `sourceType: "commonjs"`, which
 * is the filter its own runner applies.
 * @param {Corpus} testCase the case
 * @returns {boolean} whether the commonjs goal symbol applies to it
 */
const runsAsCommonjs = (testCase) =>
	testCase.commonjs !== false &&
	!testCase.options.allowAwaitOutsideFunction &&
	(!testCase.options.sourceType || testCase.options.sourceType === "script");

/**
 * Parse one case with both parsers and record how they disagreed.
 * @param {Corpus} testCase the case
 * @param {(code: string, options: Options) => EXPECTED_ANY} parse webpack's entry point
 * @param {boolean} engineValidates whether that entry defers a regexp to the host engine
 * @param {Options} mode what the run asks on top of the case's own options
 * @param {TreeDifference[]} trees where tree, comment and token differences are collected
 * @param {VerdictDifference[]} verdicts where verdicts that disagree are collected
 * @returns {void}
 */
const compareCase = (testCase, parse, engineValidates, mode, trees, verdicts) => {
	/** @type {object[]} */
	const ourComments = [];
	/** @type {TokenLike[]} */
	const ourTokens = [];
	/** @type {object[]} */
	const theirComments = [];
	/** @type {TokenLike[]} */
	const theirTokens = [];
	const { code } = testCase;
	const name = JSON.stringify(code);

	/** @type {EXPECTED_ANY} */
	let ours;
	/** @type {string} */
	let ourVerdict = "parsed";
	try {
		ours = parse(code, optionsFor(testCase, mode, ourComments, ourTokens));
	} catch (err) {
		ourVerdict = /** @type {Error} */ (err).message;
	}

	/** @type {EXPECTED_ANY} */
	let theirs;
	/** @type {string} */
	let theirVerdict = "parsed";
	try {
		theirs = acorn.parse(
			code,
			/** @type {import("acorn").Options} */ (
				optionsFor(testCase, mode, theirComments, theirTokens)
			)
		);
	} catch (err) {
		theirVerdict = /** @type {Error} */ (err).message;
	}

	if (ourVerdict !== theirVerdict) {
		if (
			isStackDepth(ourVerdict) ||
			isStackDepth(theirVerdict) ||
			(engineValidates && isEngineValidated(ours, theirVerdict))
		) {
			return;
		}
		verdicts.push({
			case: name,
			file: testCase.file,
			webpack: ourVerdict,
			acorn: theirVerdict
		});
		return;
	}
	if (ourVerdict !== "parsed") return;

	const tree = firstDifference(ours, theirs, "program");
	if (tree) trees.push({ case: name, file: testCase.file, ...tree });
	const comments = firstDifference(ourComments, theirComments, "comments");
	if (comments) trees.push({ case: name, file: testCase.file, ...comments });
	const tokens = firstDifference(
		ourTokens.map((token) => tokenShape(token)),
		theirTokens.map((token) => tokenShape(token)),
		"tokens"
	);
	if (tokens) trees.push({ case: name, file: testCase.file, ...tokens });
};

/**
 * Whether webpack's verdict is the one acorn's own suite recorded for a case.
 * A `~`-prefixed expectation asks for a substring, as acorn's driver does.
 * @param {Corpus} testCase the case
 * @param {string} verdict what webpack answered
 * @returns {boolean} whether the case passes acorn's own assertion
 */
const meetsExpectation = (testCase, verdict) => {
	if (isStackDepth(testCase.error) || isStackDepth(verdict)) return true;
	if (testCase.error === undefined) return verdict === "parsed";
	return testCase.error.startsWith("~")
		? verdict.includes(testCase.error.slice(1))
		: verdict === testCase.error;
};

describe("acorn corpus", () => {
	it("is vendored from the acorn webpack is compared against", () => {
		// The corpus carries acorn's own error messages, so a bumped
		// devDependency needs the refresh below run against the new version.
		expect(corpus.acornVersion).toBe(ACORN_VERSION);
		expect(corpus.cases.length).toBeGreaterThan(3000);
	});

	it("still says what acorn's checked-out suite says", () => {
		// Only where acorn's sources were checked out, which is the one place the
		// vendored corpus can be checked against what it came from.
		const tests = path.join(ACORN_CHECKOUT, "test");
		if (!fs.existsSync(path.join(tests, "driver.js"))) return;
		const refreshed = renderCorpus(
			ACORN_VERSION,
			collectAcornCases(tests).map((testCase) => corpusEntryOf(testCase))
		);
		if (process.env.WEBPACK_UPDATE_ACORN_CORPUS) {
			fs.writeFileSync(CORPUS_FILE, refreshed);
			return;
		}
		expect(refreshed).toBe(fs.readFileSync(CORPUS_FILE, "utf8"));
	});

	for (const [parserName, parse, engineValidates, readsBuildModes] of PARSERS) {
		describe(parserName, () => {
			it.each(["inside", "instanceofValue", "in𐐀", "instanceof𐐀"])(
				"keeps strict mode before the identifier %s",
				(identifier) => {
					expect(() =>
						parse(`function f() { "use strict"\n${identifier}: 00; }`, {
							ecmaVersion: "latest",
							sourceType: "script"
						})
					).toThrow(/Invalid number/);
				}
			);

			for (const [modeName, mode, buildOnly] of MODES) {
				if (buildOnly && !readsBuildModes) continue;
				it(
					`builds acorn's tree ${modeName}`,
					() => {
						/** @type {TreeDifference[]} */
						const trees = [];
						/** @type {VerdictDifference[]} */
						const verdicts = [];
						let compared = 0;
						for (const testCase of corpus.cases) {
							if (mode.sourceType === "commonjs" && !runsAsCommonjs(testCase)) {
								continue;
							}
							compareCase(
								testCase,
								parse,
								engineValidates,
								mode,
								trees,
								verdicts
							);
							compared++;
						}
						expect(reportable(trees)).toEqual([]);
						expect(reportable(verdicts)).toEqual([]);
						expect(compared).toBeGreaterThan(1000);
					},
					CORPUS_TIMEOUT
				);
			}

			it(
				"answers every case the way acorn's own suite asserts",
				() => {
					/** @type {{ case: string, file: string, expected: string, webpack: string }[]} */
					const differences = [];
					for (const testCase of corpus.cases) {
						/** @type {EXPECTED_ANY} */
						let ours;
						/** @type {string} */
						let verdict = "parsed";
						try {
							ours = parse(testCase.code, optionsFor(testCase, {}, [], []));
						} catch (err) {
							verdict = /** @type {Error} */ (err).message;
						}
						if (meetsExpectation(testCase, verdict)) continue;
						if (engineValidates && isEngineValidated(ours, testCase.error)) {
							continue;
						}
						differences.push({
							case: JSON.stringify(testCase.code),
							file: testCase.file,
							expected: testCase.error || "parsed",
							webpack: verdict
						});
					}
					expect(reportable(differences)).toEqual([]);
				},
				CORPUS_TIMEOUT
			);
		});
	}
});

describe("acorn corpus recording", () => {
	/**
	 * A checkout holding one test file, written the way acorn writes them.
	 * @param {string} source what the file calls the driver with
	 * @returns {string} the directory to collect from
	 */
	const checkoutWith = (source) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acorn-corpus-"));
		fs.writeFileSync(path.join(dir, "tests-fake.js"), source);
		// only `tests*.js` is read, so a sibling the collector must skip
		fs.writeFileSync(path.join(dir, "driver.js"), "throw new Error('read')");
		return dir;
	};

	it("records what acorn's driver would have run", () => {
		const dir = checkoutWith(
			[
				'var driver = require("./driver.js");',
				'var acorn = require("../../acorn");',
				'driver.test("var x", { type: "Program" }, { ecmaVersion: 2015 });',
				'driver.testFail("var", "Unexpected token (1:3)");',
				'driver.testAssert("x", function (ast) { return ast ? null : "no"; });',
				'if (!acorn.tokTypes) throw new Error("no token types");'
			].join("\n")
		);

		expect(collectAcornCases(dir)).toEqual([
			{
				file: "tests-fake.js",
				code: "var x",
				options: { ecmaVersion: 2015 }
			},
			{
				file: "tests-fake.js",
				code: "var",
				options: undefined,
				error: "Unexpected token (1:3)"
			},
			{ file: "tests-fake.js", code: "x", options: undefined }
		]);
		fs.rmSync(dir, { recursive: true });
	});

	it("keeps only the options a vendored case can carry", () => {
		expect(
			corpusEntryOf({
				file: "tests-fake.js",
				code: "x",
				options: {
					ecmaVersion: 2020,
					sourceType: "module",
					onComment: [],
					onToken: [],
					onTrailingComma() {},
					loose: false,
					commonjs: false
				},
				error: "~boom"
			})
		).toEqual({
			file: "tests-fake.js",
			code: "x",
			options: {
				ecmaVersion: 2020,
				sourceType: "module",
				onComment: true,
				onToken: true
			},
			commonjs: false,
			error: "~boom"
		});
	});

	it("parses a case naming no version as acorn's driver does", () => {
		expect(corpusEntryOf({ file: "f.js", code: "x" }).options).toEqual({
			locations: true,
			ecmaVersion: 5
		});
	});

	it("writes one case per line under the version they came from", () => {
		/**
		 * @param {string} code the case's source
		 * @returns {Corpus} the entry
		 */
		const entry = (code) => ({
			file: "f.js",
			code,
			options: { ecmaVersion: 5 }
		});

		expect(renderCorpus("8.0.0", [entry("a"), entry("b")])).toBe(
			[
				"{",
				'"acornVersion": "8.0.0",',
				'"cases": [',
				'{"file":"f.js","code":"a","options":{"ecmaVersion":5}},',
				'{"file":"f.js","code":"b","options":{"ecmaVersion":5}}',
				"]",
				"}",
				""
			].join("\n")
		);
	});
});

// The owned validator runs on the lazy path only for a pattern the host
// engine rejected; the base parser validates every literal, as acorn does.
/** @type {import("acorn").ecmaVersion[]} */
const ECMA_VERSIONS = [5, 2015, 2017, 2018, 2020, 2022, 2024, 2025, "latest"];

// Each a regexp literal, as `/pattern/flags;`.
const PATTERNS = fixtures("javascript")
	.filter(({ name }) => /^reg-exp-validator-pattern(-\d+)?$/.test(name))
	.map(({ source }) => source);

/**
 * What a parser makes of a regexp literal: `parsed`, or the error it threw.
 * @param {(source: string, options: { ecmaVersion: import("acorn").ecmaVersion }) => unknown} parse the parser
 * @param {string} source the program text
 * @param {import("acorn").ecmaVersion} ecmaVersion the ecmaVersion to parse at
 * @returns {string} the verdict
 */
const verdictOf = (parse, source, ecmaVersion) => {
	try {
		parse(source, { ecmaVersion });
		return "parsed";
	} catch (err) {
		return /** @type {Error} */ (err).message;
	}
};

describe("RegExpValidator", () => {
	for (const ecmaVersion of ECMA_VERSIONS) {
		it(`rejects and accepts the same patterns as acorn at ecmaVersion ${ecmaVersion}`, () => {
			const differences = [];
			let rejected = 0;
			for (const source of PATTERNS) {
				const ours = verdictOf(
					(code, options) => Parser.parse(code, options),
					source,
					ecmaVersion
				);
				const theirs = verdictOf(
					(code, options) => acorn.parse(code, options),
					source,
					ecmaVersion
				);
				if (ours !== theirs) differences.push({ source, ours, theirs });
				if (theirs !== "parsed") rejected++;
			}
			expect(differences).toEqual([]);
			// the corpus is meant to exercise the error paths, not only the happy ones
			expect(rejected).toBeGreaterThan(PATTERNS.length / 4);
		});
	}

	it("reports the flag errors before reading the pattern", () => {
		// the pattern is malformed too, so the flag error has to win the race
		expect(() => Parser.parse(fixture("javascript", "reg-exp-validator-reports-the-flag-errors-before-reading-the-pattern"), { ecmaVersion: 2024 })).toThrow(
			/Duplicate regular expression flag/
		);
		expect(() => Parser.parse(fixture("javascript", "reg-exp-validator-reports-the-flag-errors-before-reading-the-pattern-2"), { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse(fixture("javascript", "reg-exp-validator-reports-the-flag-errors-before-reading-the-pattern-3"), { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse(fixture("javascript", "reg-exp-validator-reports-the-flag-errors-before-reading-the-pattern-4"), { ecmaVersion: 2023 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse(fixture("javascript", "reg-exp-validator-reports-the-flag-errors-before-reading-the-pattern-4"), { ecmaVersion: 2024 })).toThrow(
			/Unterminated group/
		);
	});

	it("reads a name repeated across alternatives at the cost of distinct ones", () => {
		// Both patterns are legal and the same size; only the duplicate one asks
		// which alternatives rule each other out, which acorn answers by walking
		// one branch chain per node of the other (acornjs/acorn#1445).
		/**
		 * @param {number} depth how many disjunctions enclose the group
		 * @param {string} name the group's name
		 * @returns {string} one named group, nested that deep
		 */
		const nest = (depth, name) =>
			`${"(?:".repeat(depth)}(?<${name}>a)${")".repeat(depth)}`;

		/**
		 * @param {number} count how many alternatives to write
		 * @param {number} depth how deep each one nests its group
		 * @param {boolean} duplicate whether every group carries the same name
		 * @returns {string} the program holding that regexp literal
		 */
		const pattern = (count, depth, duplicate) =>
			`/${Array.from({ length: count }, (_, i) =>
				nest(depth, duplicate ? "x" : `x${i}`)
			).join("|")}/v;`;

		/**
		 * @param {string} source the program to parse
		 * @returns {number} the fastest of three parses, in nanoseconds
		 */
		const best = (source) => {
			let fastest = Infinity;
			for (let run = 0; run < 3; run++) {
				const started = process.hrtime.bigint();
				Parser.parse(source, { ecmaVersion: "latest" });
				fastest = Math.min(fastest, Number(process.hrtime.bigint() - started));
			}
			return fastest;
		};
		const distinct = best(pattern(160, 160, false));
		const repeated = best(pattern(160, 160, true));
		// The two were ~80x apart before the rewrite and are within noise of each
		// other after it, so the bound only has to catch the quadratic walk.
		expect(repeated).toBeLessThan(distinct * 10);
	});
});

// acorn's typings omit half its exports, and the port's types are its contract
const acornPort = /** @type {ParserExports} */ (/** @type {unknown} */ (acorn));
const {
	
	Position,
	ParserSourceLocation,
	defaultOptions,
	getLineInfo,
	isIdentifierChar,
	isIdentifierStart,
	isNewLine,
	keywordTypes,
	stringToNumber,
	tokContexts,
	tokTypes
} = require("../../../lib/javascript/syntax-parser");

// The base parser is what `Parser.parse`, acorn plugins and the tokenizer
// reach; a build never does, so this holds it to acorn on its own.

/** @type {string[]} */
const PROGRAMS = [
	// statements
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-2"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-3"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-4"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-5"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-6"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-7"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-8"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-9"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-10"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-11"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-12"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-13"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-2"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-14"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-15"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-16"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-17"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-18"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-19"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-20"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-21"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-22"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-23"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-24"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-25"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-26"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-27"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-28"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-29"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-30"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-31"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-32"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-33"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-34"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-35"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-36"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-37"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-38"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-39"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-40"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-41"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-42"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-43"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-44"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-45"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-46"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-47"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-48"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-49"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-50"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-51"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-52"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-53"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-54"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-55"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-56"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-57"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-58"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-59"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-60"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-3"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-61"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-62"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-63"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-64"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-65"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-66"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-67"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-68"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-69"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-70"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-71"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-72"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-73"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-74"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-75"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-76"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-77"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-78"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-79"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-80"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-81"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-82"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-83"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-84"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-85"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-86"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-87"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-88"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-89"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-90"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-91"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-92"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-93"),
	fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-94"),
	fixture("javascript", "webpack-parser-reserved-words-and-bindings-should-reject-contextual-and-reserved-2"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-95"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-96"),
	fixture("javascript", "webpack-parser-expressions-spreads-and-parameter-checks-should-check-identifier-3"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-97"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-98"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-99"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-100"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-101"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-102"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-103"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-104"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-105"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-106"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-107"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-108"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-109"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-110"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-111"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-112"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-113"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-114"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-115"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-116"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-117"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-118"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-119"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-4"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-120"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-121"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-122"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-123"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-124"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-125"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-126"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-127"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-128"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-129"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-130"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-131"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-132"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-133"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-134"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-135"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-136"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-137"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-138"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-139"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-140"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-141"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-142"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-143"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-144"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-145"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-146"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-147"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-148"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-149"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-150"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-151"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-152"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-153"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-154"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-155"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-156"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-157"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-158"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-159"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-160"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-161"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-162"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-163"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-164"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-165"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-166"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-167"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-168"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-169"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-170"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-171"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-172"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-173"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-174"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-175"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-176"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-177"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-178"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-179"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-180"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-181"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-182"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-183"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-184"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-5"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-185"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-186"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-187"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-188"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-189"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-190"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-191"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-192"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-193"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-194"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-195"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-196"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-197"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-198"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-199"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-200"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-201"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-202"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-203"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-204"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-205"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-206"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-207"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-208"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-209"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-210"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-211"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-212"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-213"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-214"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-215"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-216"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-217"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-218"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-219"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-220"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-221"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-222"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-223"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-224"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-225"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-226"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-227"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-228"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-229"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-230"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-231"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-232"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-233"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-6"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-234"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-235"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-236"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-237"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-238"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-239"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-240"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-241"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-242"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-243"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-244"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-245"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-246"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-247"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-248"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-249"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-250"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-251"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-252"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-253"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-254"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-255"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-256"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-257"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-7"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-8"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-258"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-259"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-260"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-261"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-262"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-263"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-264"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-265"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-266"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-267"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-268"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-269"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-270"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-271"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-272"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-273"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-274"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-275"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-276"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-277"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-278"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-279"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-280"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-281"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-282"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-283"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-284"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-285"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-286"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-287"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-288"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-289"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-290"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-291"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-292"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-293"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-294"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-295"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-296"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-297"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-298"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-299"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-300"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-301"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-302"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-303"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-304"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-305"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-306"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-307"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-308"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-309"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-310"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-311"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-312"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-313"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-314"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-315"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-316"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-317"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-318"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-319"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-320"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-321"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-322"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-323"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-324"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-325"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-326"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-327"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-328"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-329"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-330"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-331"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-332"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-333"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-334"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-61"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-335"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-336"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-337"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-338"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-3"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-339"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-340"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-341"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-342"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-343"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-344"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-345"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-346"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-347"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-348"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-349"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-350"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-351"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-352"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-353"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-354"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-355"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-356"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-357"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-358"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-359"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-360"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-361"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-362"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-363"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-364"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-365"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-366"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-367"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-368"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-369"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-370"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-371"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-372"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-373"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-374"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-375"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-376"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-377"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-378"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-379"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-380"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-381"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-382"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-383"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-384"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-385"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-386"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-387"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-388"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-389"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-390"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-391"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-392"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-393"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-394"),
	"",
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-395"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-396"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-397"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-398"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-399"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-400"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-401"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-402"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-403"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-404"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-405"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-406"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-407"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-408"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-409"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-410"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-411"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-412"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-413"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-414"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-415"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-416"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-417"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-418"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-419"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-420"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-421"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-422"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-423"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-424"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-425"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-426"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-427"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-428"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-429"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-430"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-431"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-432"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-433"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-434"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-435"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-436"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-437"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-438"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-439"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-440"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-440"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-441"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-442"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-442"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-443"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-443"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-444"),
	"x = \uD800;",
	"x = \uDC00;",
	"x = '\uD800';",
	"x = \uD83D;",
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-445"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-446"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-446"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-447"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-448"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-449"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-450"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-451"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-452"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-453"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-454"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-455"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-456"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-457"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-458"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-459"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-460"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-461"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-462"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-463"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-464"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-465"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-466"),
	// explicit resource management
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-467"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-468"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-469"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-470"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-471"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-472"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-473"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-474"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-475"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-476"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-477"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-478"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-479"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-480"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-481"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-482"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-483"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-484"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-9"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-485"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-486"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-487"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-488"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-489"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-490"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-491"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-492"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-493"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-494"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-495"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-496"),
	// destructuring and assignment targets
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-497"),
	fixture("javascript", "webpack-parser-object-literals-and-patterns-single-shape-nodes-should-keep-acorn-4"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-498"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-499"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-500"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-501"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-502"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-503"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-504"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-505"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-506"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-507"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-508"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-509"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-510"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-511"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-512"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-513"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-514"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-515"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-516"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-517"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-518"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-519"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-520"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-521"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-522"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-523"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-524"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-525"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-526"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-527"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-528"),
	fixture("javascript", "webpack-parser-subscript-parsing-should-parse-async-arrows-through-the-call-2"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-529"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-530"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-531"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-532"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-533"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-534"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-535"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-536"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-537"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-538"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-539"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-540"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-541"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-542"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-543"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-544"),
	// statements
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-545"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-546"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-10"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-547"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-548"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-549"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-550"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-551"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-552"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-553"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-554"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-555"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-556"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-557"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-558"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-559"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-560"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-561"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-562"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-563"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-564"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-565"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-566"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-567"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-568"),
	// classes
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-569"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-570"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-571"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-11"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-572"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-573"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-574"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-575"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-576"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-577"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-578"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-579"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-580"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-581"),
	// modules
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-582"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-583"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-584"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-585"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-586"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-587"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-588"),
	fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-12"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-589"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-590"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-591"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-592"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-593"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-594"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-595"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-596"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-597"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-598"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-599"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-600"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-601"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-602"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-603"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-604"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-605"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-606"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-607"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-608"),
	// tokens
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-609"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-610"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-611"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-612"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-613"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-614"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-615"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-616"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-617"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-618"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-619"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-620"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-621"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-622"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-623"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-624"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-625"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-626"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-627"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-628"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-629"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-630"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-631"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-632"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-633"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-634"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-635"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-636"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-637"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-638"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-639"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-640"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-641"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-642"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-643"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-644"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-645"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-646"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-647"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-648"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-649"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-650"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-651"),
	// second pass over the grammar's remaining branches
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-652"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-653"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-654"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-655"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-656"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-657"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-658"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-659"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-660"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-661"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-662"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-663"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-664"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-665"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-666"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-667"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-668"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-669"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-670"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-671"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-672"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-673"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-674"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-675"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-676"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-677"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-678"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-679"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-680"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-681"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-682"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-683"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-684"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-685"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-686"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-687"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-688"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-689"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-690"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-691"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-692"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-693"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-694"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-695"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-696"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-697"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-698"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-699"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-700"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-701"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-702"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-703"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-704"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-705"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-706"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-707"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-708"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-709"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-710"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-711"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-712"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-713"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-714"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-715"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-716"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-717"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-718"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-719"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-720"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-721"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-722"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-723"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-724"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-725"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-726"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-727"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-728"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-729"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-730"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-731"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-732"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-733"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-734"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-688"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-735"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-736"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-737"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-738"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-739"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-740"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-741"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-742"),
	// what the look-ahead past `let`, `async` and `using` skips
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-743"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-744"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-745"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-746"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-747"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-748"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-749"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-750"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-751"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-752"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-753"),
	fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-754"),
	// more lexical declarations in one block than a bit mask holds
	...[
		"{ # }",
		"#",
		"switch (x) { case 0: # }",
		"switch (x) { case 0: # case 1: }",
		"class A { static { # } }"
	].map(
		(shape) =>
			shape.replace(
				"#",
				Array.from({ length: 40 }, (_, i) => `let v${i};`).join(" ")
			)
	)
];

/** @type {[string, Record<string, unknown>][]} */
const OPTION_SETS = [
	["script, latest", { ecmaVersion: "latest", sourceType: "script" }],
	["module, latest", { ecmaVersion: "latest", sourceType: "module" }],
	["commonjs, latest", { ecmaVersion: "latest", sourceType: "commonjs" }],
	["script, es3", { ecmaVersion: 3 }],
	["script, es5", { ecmaVersion: 5 }],
	["script, es2015", { ecmaVersion: 2015 }],
	["script, es2017", { ecmaVersion: 2017 }],
	["script, es2018", { ecmaVersion: 9 }],
	["module, es2020", { ecmaVersion: 2020, sourceType: "module" }],
	["module, es2022", { ecmaVersion: 2022, sourceType: "module" }],
	[
		"script with locations",
		{ ecmaVersion: "latest", sourceType: "script", locations: true }
	],
	[
		"module with locations and ranges",
		{
			ecmaVersion: "latest",
			sourceType: "module",
			locations: true,
			ranges: true
		}
	],
	[
		"script with a source file",
		{ ecmaVersion: "latest", locations: true, sourceFile: "a.js" }
	],
	[
		"script starting at a given location",
		{
			ecmaVersion: "latest",
			locations: true,
			startLocation: { line: 5, column: 3 }
		}
	],
	[
		"script with a direct source file",
		{ ecmaVersion: "latest", directSourceFile: "a.js" }
	],
	[
		"script with everything allowed",
		{
			ecmaVersion: "latest",
			allowReturnOutsideFunction: true,
			allowImportExportEverywhere: true,
			allowAwaitOutsideFunction: true,
			allowSuperOutsideMethod: true,
			allowHashBang: true,
			allowReserved: true
		}
	],
	[
		"script with reserved words refused",
		{ ecmaVersion: "latest", allowReserved: "never" }
	],
	[
		"script with parens preserved",
		{ ecmaVersion: "latest", preserveParens: true }
	],
	[
		"module with private fields unchecked",
		{ ecmaVersion: "latest", sourceType: "module", checkPrivateFields: false }
	],
	["script without hashbang", { ecmaVersion: "latest", allowHashBang: false }],
	["strict script", { ecmaVersion: "latest", strict: true }],
	[
		"script allowing await and super anywhere",
		{
			ecmaVersion: "latest",
			allowAwaitOutsideFunction: true,
			allowSuperOutsideMethod: true,
			allowImportExportEverywhere: true
		}
	],
	["script, es2021 with hashbang", { ecmaVersion: 2021, allowHashBang: true }]
];

/**
 * What a parser makes of a program: its tree, comments and tokens, or the
 * error it threw with where it was raised.
 * @param {(source: string, options: EXPECTED_ANY) => unknown} parse the parser
 * @param {string} source the program text
 * @param {Record<string, unknown>} options parse options
 * @returns {unknown} the outcome as plain data
 */
const outcomeOf = (parse, source, options) => {
	/** @type {unknown[]} */
	const comments = [];
	/** @type {unknown[]} */
	const tokens = [];
	try {
		const ast = parse(source, {
			...options,
			onComment: comments,
			onToken: tokens
		});
		return {
			ast: plain(ast),
			comments: plain(comments),
			tokens: plain(tokens)
		};
	} catch (err) {
		const error =
			/** @type {Error & { pos?: number, loc?: unknown, raisedAt?: number }} */ (
				err
			);
		return {
			error: error.message,
			pos: error.pos,
			loc: plain(error.loc),
			raisedAt: error.raisedAt
		};
	}
};

describe("Parser", () => {
	describe("parses like acorn", () => {
		for (const [name, options] of OPTION_SETS) {
			it(`for every program as ${name}`, () => {
				const differences = [];
				let rejected = 0;
				for (const source of PROGRAMS) {
					const ours = outcomeOf(
						(code, opts) => Parser.parse(code, opts),
						source,
						options
					);
					const theirs = outcomeOf(
						(code, opts) => acornPort.Parser.parse(code, opts),
						source,
						options
					);
					if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
						differences.push({ source, ours, theirs });
					}
					if ("error" in /** @type {{ error?: string }} */ (theirs)) rejected++;
				}
				expect(differences).toEqual([]);
				expect(rejected).toBeGreaterThan(0);
				expect(rejected).toBeLessThan(PROGRAMS.length);
			});
		}
	});

	// The same programs through the parser a build runs, as it builds objects,
	// as it builds lazy nodes, and as it writes a syntax tree: the three take
	// different paths through its own productions.
	describe("parses like acorn as the parser a build runs", () => {
		const {
			SyntaxTree,
			WebpackParser
		} = require("../../../lib/javascript/syntax-parser");
		/**
		 * A plugin overriding every method with one calling it, which turns off
		 * each fast path that checks a method is still the parser's own.
		 * @param {typeof WebpackParser} BaseParser the parser to extend
		 * @returns {typeof WebpackParser} the parser overriding all it inherits
		 */
		const overridingAll = (BaseParser) => {
			class Overriding extends BaseParser {}
			const seen = new Set(["constructor"]);
			for (
				let proto = BaseParser.prototype;
				proto !== Object.prototype;
				proto = Object.getPrototypeOf(proto)
			) {
				for (const name of Object.getOwnPropertyNames(proto)) {
					const { value } = /** @type {PropertyDescriptor} */ (
						Object.getOwnPropertyDescriptor(proto, name)
					);
					if (seen.has(name) || typeof value !== "function") continue;
					seen.add(name);
					const inherited = /** @type {EXPECTED_ANY} */ (BaseParser.prototype)[
						name
					];
					/** @type {EXPECTED_ANY} */ (Overriding.prototype)[name] =
						/**
						 * @this {unknown}
						 * @param {...unknown} args the arguments
						 * @returns {unknown} what the inherited method returns
						 */
						function override(...args) {
							return inherited.apply(this, args);
						};
				}
			}
			return Overriding;
		};
		const Overriding = WebpackParser.extend(
			/** @type {EXPECTED_ANY} */ (overridingAll)
		);
		/** @type {[string, Record<string, unknown>, (code: string, options: EXPECTED_ANY) => unknown][]} */
		const BUILD_MODES = [
			["eagerly", {}, (code, options) => webpackParse(code, options)],
			[
				"eagerly, under a plugin overriding every method",
				{},
				(code, options) => Overriding.parse(code, options)
			],
			[
				"lazily, under a plugin overriding every method",
				{ lazyNodes: true },
				(code, options) => Overriding.parse(code, options)
			],
			[
				"lazily",
				{ lazyNodes: true },
				(code, options) => webpackParse(code, options)
			],
			[
				"into a syntax tree",
				{ lazyNodes: true },
				(code, options) => {
					const tree = new SyntaxTree();
					const program = new WebpackParser(
						{ ...options, syntaxTree: tree },
						code
					).parse();
					return tree.estree(/** @type {number} */ (/** @type {unknown} */ (program)));
				}
			]
		];
		/**
		 * @param {(code: string, options: EXPECTED_ANY) => unknown} parse the parser
		 * @param {string} source the program text
		 * @param {Record<string, unknown>} options parse options
		 * @param {boolean} collect whether comments and tokens are collected
		 * @returns {{ ast?: unknown, rest: unknown }} the tree, apart from the rest of the outcome
		 */
		const buildOutcomeOf = (parse, source, options, collect) => {
			/** @type {unknown[]} */
			const comments = [];
			/** @type {unknown[]} */
			const tokens = [];
			try {
				const ast = parse(
					source,
					collect ? { ...options, onComment: comments, onToken: tokens } : options
				);
				return { ast, rest: plain({ comments, tokens }) };
			} catch (err) {
				return { rest: outcomeOf(() => { throw err; }, source, options) };
			}
		};
		for (const [name, options] of OPTION_SETS) {
			for (const [modeName, mode, parse] of BUILD_MODES) {
				const lazy = mode.lazyNodes === true;
				// Lazy nodes carry offsets alone, and a tree only the latest edition.
				if (lazy && (options.locations || options.directSourceFile)) continue;
				if (modeName.endsWith("tree") && options.ecmaVersion !== "latest") {
					continue;
				}
				// a source type named is what a build always names
				const given = { sourceType: "script", ...options };
				it(`for every program as ${name}, ${modeName}`, () => {
					const differences = [];
					for (const source of PROGRAMS) {
						// webpack reads the legacy `assert` clause acorn has dropped
						if (/ assert \{/.test(source)) continue;
						const ours = buildOutcomeOf(
							parse,
							source,
							{ ...given, ...mode },
							!lazy
						);
						const theirs = buildOutcomeOf(
							(code, opts) => acornPort.Parser.parse(code, opts),
							source,
							{ ...given, ranges: Boolean(options.ranges) || lazy },
							!lazy
						);
						const tree = firstDifference(ours.ast, theirs.ast, "program");
						if (tree || JSON.stringify(ours.rest) !== JSON.stringify(theirs.rest)) {
							differences.push({ source, tree, ours: ours.rest, theirs: theirs.rest });
						}
					}
					expect(differences).toEqual([]);
				});
			}
		}
	});

	// acorn's loose parser and its plugins override `raiseRecoverable` to note
	// an error and read on, which takes every parser past the checks that throw.
	describe("parses like acorn with recoverable errors noted", () => {
		const {
			SyntaxTree,
			WebpackParser
		} = require("../../../lib/javascript/syntax-parser");
		/** @type {[number, string][]} */
		let noted = [];
		/**
		 * @param {EXPECTED_ANY} BaseParser the parser to extend
		 * @returns {EXPECTED_ANY} the parser noting recoverable errors
		 */
		const noting = (BaseParser) =>
			class extends BaseParser {
				/**
				 * @param {number} pos where the error is
				 * @param {string} message what it is
				 */
				raiseRecoverable(pos, message) {
					noted.push([pos, message]);
				}
			};
		const Acorn = acornPort.Parser.extend(noting);
		const NotingPort = Parser.extend(noting);
		const NotingWebpack = WebpackParser.extend(noting);
		/** @type {[string, (code: string, options: EXPECTED_ANY) => unknown, Record<string, unknown>][]} */
		const NOTING_PARSERS = [
			[
				"the ported base parser",
				(code, options) => NotingPort.parse(code, options),
				{}
			],
			[
				"the parser a build runs",
				(code, options) => NotingWebpack.parse(code, options),
				{}
			],
			[
				"the parser a build runs, lazily",
				(code, options) => NotingWebpack.parse(code, options),
				{ lazyNodes: true }
			],
			[
				"the parser a build runs, into a syntax tree",
				(code, options) => {
					const tree = new SyntaxTree();
					const program = new NotingWebpack(
						{ ...options, syntaxTree: tree },
						code
					).parse();
					return tree.estree(/** @type {number} */ (/** @type {unknown} */ (program)));
				},
				{ lazyNodes: true, syntaxTree: true }
			]
		];
		/**
		 * @param {(code: string, options: EXPECTED_ANY) => unknown} parse the parser
		 * @param {string} source the program text
		 * @param {Record<string, unknown>} options parse options
		 * @returns {{ ast?: unknown, error?: string, noted: [number, string][] }} the outcome
		 */
		const notedOutcomeOf = (parse, source, options) => {
			noted = [];
			try {
				return { ast: parse(source, options), noted };
			} catch (err) {
				// a parse error by its message; a crash after a noted error only by
				// its kind, as engines word a TypeError each their own way
				return {
					error:
						err instanceof SyntaxError
							? err.message
							: /** @type {Error} */ (err).name,
					noted
				};
			}
		};
		for (const [name, options] of OPTION_SETS) {
			for (const [parserName, parse, mode] of NOTING_PARSERS) {
				const lazy = mode.lazyNodes === true;
				if (lazy && (options.locations || options.directSourceFile)) continue;
				if (mode.syntaxTree && options.ecmaVersion !== "latest") continue;
				const given = { sourceType: "script", ...options };
				it(`for every program as ${name}, by ${parserName}`, () => {
					const differences = [];
					let recovered = 0;
					for (const source of PROGRAMS) {
						if (/ assert \{/.test(source)) continue;
						const ours = notedOutcomeOf(parse, source, { ...given, ...mode });
						const theirs = notedOutcomeOf(
							(code, opts) => Acorn.parse(code, opts),
							source,
							{ ...given, ranges: Boolean(options.ranges) || lazy }
						);
						// Where acorn crashes after an error it noted, ours may read on
						// past it, noting at least the same errors first.
						if (
							theirs.error === "TypeError" &&
							theirs.noted.length > 0 &&
							ours.error === undefined &&
							JSON.stringify(ours.noted).startsWith(
								JSON.stringify(theirs.noted).slice(0, -1)
							)
						) {
							recovered++;
							continue;
						}
						const tree = firstDifference(ours.ast, theirs.ast, "program");
						if (
							tree ||
							ours.error !== theirs.error ||
							JSON.stringify(ours.noted) !== JSON.stringify(theirs.noted)
						) {
							differences.push({ source, tree, ours, theirs });
						}
						if (theirs.noted.length > 0) recovered++;
					}
					expect(differences).toEqual([]);
					expect(recovered).toBeGreaterThan(0);
				});
			}
		}
	});

	// What a plugin may call on a parser, with what the parser itself never
	// passes: a missing record or export table, an object for clashes, a node
	// no production makes.
	describe("answers acorn's plugin calls like acorn", () => {
		const { WebpackParser } = require("../../../lib/javascript/syntax-parser");
		const BIND_LEXICAL = 2;
		const BIND_SIMPLE_CATCH = 4;
		const BIND_OUTSIDE = 5;
		const a = { type: "Identifier", name: "a", start: 0, end: 1 };
		/** @type {[string, (parser: EXPECTED_ANY) => unknown, string?][]} */
		const CALLS = [
			["checkPatternErrors without a record", (p) => p.checkPatternErrors()],
			["checkExport without exports", (p) => p.checkExport(undefined, "a", 0)],
			[
				"checkVariableExport without exports",
				(p) => p.checkVariableExport(undefined, [{ id: a }])
			],
			[
				"checkPatternExport over a node no binding makes",
				(p) => p.checkPatternExport({}, { type: "ParenthesizedExpression" })
			],
			[
				"checkLValSimple with an object of clashes",
				(p) => {
					const clashes = {};
					p.checkLValSimple(a, BIND_OUTSIDE, clashes);
					return [clashes, p.checkLValSimple(a, BIND_OUTSIDE, clashes)];
				}
			],
			[
				"checkLValSimple binding a member",
				(p) =>
					p.checkLValSimple(
						{ type: "MemberExpression", start: 0, end: 3 },
						BIND_OUTSIDE
					)
			],
			[
				"checkLValSimple binding a parenthesized name",
				(p) =>
					p.checkLValSimple(
						{ type: "ParenthesizedExpression", start: 0, end: 3, expression: a },
						BIND_OUTSIDE
					)
			],
			[
				"checkLValSimple binding a literal",
				(p) =>
					p.checkLValSimple(
						{ type: "Literal", start: 0, end: 1, value: 1 },
						BIND_OUTSIDE
					)
			],
			[
				"checkPropClash over a key no object literal makes",
				(p) =>
					p.checkPropClash(
						{
							type: "Property",
							kind: "init",
							key: { type: "PrivateIdentifier", name: "a" }
						},
						{}
					)
			],
			[
				"declareName of a catch parameter after a lexical name",
				(p) => {
					p.declareName("a", BIND_LEXICAL, 0);
					p.declareName("b", BIND_SIMPLE_CATCH, 0);
					return p.declareName("b", BIND_LEXICAL, 0);
				}
			],
			["parsePrivateIdent off a private name", (p) => p.parsePrivateIdent()],
			["toAssignable over no node", (p) => p.toAssignable(null)],
			[
				"parseExprOps without a record",
				(p) => {
					p.nextToken();
					return p.parseExprOps();
				},
				fixture("javascript", "parser-static-entry-points-applies-acorn-plugins-through-extend")
			],
			[
				"checkLValInnerPattern without a binding kind",
				(p) => p.checkLValInnerPattern(a)
			],

			[
				"the strict-mode binding test",
				(p) => [
					p.reservedWordsStrictBind.test("eval"),
					p.reservedWordsStrictBind.test("a")
				]
			]
		];
		/** @type {[string, (options: EXPECTED_ANY, input: string) => unknown][]} */
		const INSTANCES = [
			["the ported base parser", (options, input) => new Parser(options, input)],
			[
				"the parser a build runs",
				(options, input) => new WebpackParser(options, input)
			],
			[
				"the parser a build runs, lazily",
				(options, input) =>
					new WebpackParser({ ...options, lazyNodes: true }, input)
			]
		];
		/**
		 * @param {(parser: EXPECTED_ANY) => unknown} call the call
		 * @param {unknown} parser the parser it is made on
		 * @returns {unknown} what it returned or threw, as plain data
		 */
		const answerOf = (call, parser) => {
			try {
				return { returned: plain(call(parser)) };
			} catch (err) {
				return { threw: /** @type {Error} */ (err).message };
			}
		};
		for (const [instanceName, create] of INSTANCES) {
			it.each(CALLS)(`${instanceName}: %s`, (_name, call, input = "x") => {
				/** @type {PortOptions} */
				const options = { ecmaVersion: "latest", sourceType: "module" };
				expect(answerOf(call, create(options, input))).toEqual(
					answerOf(call, new acornPort.Parser(options, input))
				);
			});
		}
	});

	it("reads a regexp after await that the tokenizer took for `/=`, unlike acorn", () => {
		// acorn 8 refuses it; V8 and the spec read `await /=/g` as a regexp
		const { SyntaxTree, WebpackParser } = require(
			"../../../lib/javascript/syntax-parser"
		);
		const source = fixture("javascript", "parser-reads-a-regexp-after-await-that-the-tokenizer-took-for-unlike-acorn");
		expect(() => new (require("vm").Script)(source)).not.toThrow();
		expect(() =>
			acornPort.Parser.parse(source, { ecmaVersion: "latest" })
		).toThrow(/Unexpected token/);
		/** @type {ParserOptions} */
		const options = { ecmaVersion: "latest", sourceType: "script" };
		const tree = new SyntaxTree();
		const program = new WebpackParser(
			{ ...options, lazyNodes: true, syntaxTree: tree },
			source
		).parse();
		for (const ast of [
			Parser.parse(source, options),
			webpackParse(source, options),
			webpackParse(source, { ...options, lazyNodes: true }),
			tree.estree(/** @type {number} */ (/** @type {unknown} */ (program)))
		]) {
			const statement = /** @type {EXPECTED_ANY} */ (ast).body[0].body.body[0];
			expect(statement.expression.argument.regex).toEqual({
				pattern: "=",
				flags: "g"
			});
		}
	});

	describe("static entry points", () => {
		it("parses an expression at an offset like acorn", () => {
			const source = fixture("javascript", "parser-static-entry-points-parses-an-expression-at-an-offset-like-acorn");
			/** @type {PortOptions} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain(Parser.parseExpressionAt(source, 8, options))).toEqual(
				plain(acornPort.Parser.parseExpressionAt(source, 8, options))
			);
			expect(
				plain(Parser.parseExpressionAt(source, 8, { ecmaVersion: "latest" }))
			).toEqual(
				plain(
					acornPort.Parser.parseExpressionAt(source, 8, {
						ecmaVersion: "latest"
					})
				)
			);
		});

		it("tokenizes like acorn", () => {
			const source = fixture("javascript", "parser-static-entry-points-tokenizes-like-acorn");
			/** @type {PortOptions} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain([...Parser.tokenizer(source, options)])).toEqual(
				plain([...acornPort.Parser.tokenizer(source, options)])
			);
			const tokenizer = Parser.tokenizer(fixture("javascript", "parser-static-entry-points-tokenizes-like-acorn-2"), { ecmaVersion: 2020 });
			expect(tokenizer.getToken().value).toBe("a");
			expect(tokenizer.getToken().value).toBe("b");
			expect(tokenizer.getToken().type).toBe(tokTypes.eof);
		});

		it("applies acorn plugins through extend", () => {
			let parses = 0;
			/** @type {(BaseParser: typeof Parser) => typeof Parser} */
			const counting = (BaseParser) =>
				class extends BaseParser {
					/**
					 * @returns {ReturnType<Parser["parse"]>} the program
					 */
					parse() {
						parses++;
						return super.parse();
					}
				};
			const Extended = Parser.extend(counting);
			expect(Extended).not.toBe(Parser);
			expect(Parser.extend()).toBe(Parser);
			const ast = Extended.parse(fixture("javascript", "parser-static-entry-points-applies-acorn-plugins-through-extend"), { ecmaVersion: 2020 });
			expect(ast.type).toBe("Program");
			expect(parses).toBe(1);
			expect(plain(ast)).toEqual(
				plain(
					acornPort.Parser.extend(counting).parse(fixture("javascript", "parser-static-entry-points-applies-acorn-plugins-through-extend"), {
						ecmaVersion: 2020
					})
				)
			);
		});

		it("normalizes options like acorn", () => {
			const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			try {
				expect(Parser.parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), {}).type).toBe("Program");
				expect(Parser.parse(fixture("javascript", "parser-static-entry-points-normalizes-options-like-acorn"), {}).type).toBe("Program");
				expect(warn).toHaveBeenCalledTimes(1);
				expect(warn.mock.calls[0][0]).toMatch(/ecmaVersion is required/);
			} finally {
				warn.mockRestore();
			}
			expect(() =>
				Parser.parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), {
					ecmaVersion: "latest",
					sourceType: "commonjs",
					allowAwaitOutsideFunction: true
				})
			).toThrow(/allowAwaitOutsideFunction with sourceType: commonjs/);
			expect(() =>
				acornPort.Parser.parse(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"), {
					ecmaVersion: "latest",
					sourceType: "commonjs",
					allowAwaitOutsideFunction: true
				})
			).toThrow(/allowAwaitOutsideFunction with sourceType: commonjs/);
			// The defaults are acorn's, plus the one hook webpack adds: a reader
			// takes what it needs off the parser rather than a token of its own.
			expect(Object.keys(defaultOptions).sort()).toEqual(
				[...Object.keys(acornPort.defaultOptions), "onTokenRead"].sort()
			);
		});

		it("reports inserted semicolons and trailing commas like acorn", () => {
			const source = fixture("javascript", "parser-static-entry-points-reports-inserted-semicolons-and-trailing-commas-like");
			/** @type {(parse: (code: string, options: EXPECTED_ANY) => unknown, locations?: boolean) => unknown[][]} */
			const eventsOf = (parse, locations = true) => {
				/** @type {unknown[][]} */
				const events = [];
				parse(source, {
					ecmaVersion: "latest",
					locations,
					allowReturnOutsideFunction: true,
					onInsertedSemicolon: (
						/** @type {number} */ end,
						/** @type {unknown} */ loc
					) => events.push(["semicolon", end, loc && plain(loc)]),
					onTrailingComma: (
						/** @type {number} */ end,
						/** @type {unknown} */ loc
					) => events.push(["comma", end, loc && plain(loc)])
				});
				return events;
			};
			const theirs = eventsOf((code, opts) => acornPort.Parser.parse(code, opts));
			expect(theirs).not.toHaveLength(0);
			expect(eventsOf((code, opts) => Parser.parse(code, opts))).toEqual(
				theirs
			);
			expect(eventsOf((code, opts) => webpackParse(code, opts))).toEqual(
				theirs
			);
			// lazy nodes need locations off, and so do acorn's to compare
			const unlocated = eventsOf(
				(code, opts) => acornPort.Parser.parse(code, opts),
				false
			);
			expect(
				eventsOf(
					(code, opts) => webpackParse(code, { ...opts, lazyNodes: true }),
					false
				)
			).toEqual(unlocated);
		});

		it("appends to a program node the caller continues", () => {
			const program = acornPort.Parser.parse("a;", { ecmaVersion: 2020 });
			const continued = Parser.parse(fixture("javascript", "parser-static-entry-points-appends-to-a-program-node-the-caller-continues"), { ecmaVersion: 2020, program });
			expect(continued).toBe(program);
			expect(continued.body.map((node) => node.type)).toEqual([
				"ExpressionStatement",
				"ExpressionStatement"
			]);
		});
	});

	describe("helpers", () => {
		it("maps offsets to lines like acorn", () => {
			const input = "a\nbb\r\nccc\u2028d";
			for (const offset of [0, 1, 2, 4, 5, 6, 7, 10, 11, 12]) {
				expect(plain(getLineInfo(input, offset))).toEqual(
					plain(acornPort.getLineInfo(input, offset))
				);
			}
			expect(new Position(3, 4).offset(2)).toEqual(new Position(3, 6));
			expect(
				new ParserSourceLocation(
					/** @type {EXPECTED_ANY} */ ({ sourceFile: "f.js" }),
					new Position(1, 0),
					new Position(1, 1)
				).source
			).toBe("f.js");
		});

		it("classifies identifier characters like acorn", () => {
			for (const code of [
				0x24, 0x30, 0x41, 0x5f, 0x61, 0xaa, 0x2118, 0x309b, 0x10000, 0xe0001,
				0x200c, 0xb7, 0x300
			]) {
				expect(isIdentifierStart(code, true)).toBe(
					acornPort.isIdentifierStart(code, true)
				);
				expect(isIdentifierChar(code, true)).toBe(
					acornPort.isIdentifierChar(code, true)
				);
				expect(isIdentifierStart(code, false)).toBe(
					acornPort.isIdentifierStart(code, false)
				);
				expect(isIdentifierChar(code, false)).toBe(
					acornPort.isIdentifierChar(code, false)
				);
			}
			for (const code of [10, 13, 0x2028, 0x2029, 32, 0xa0]) {
				expect(isNewLine(code)).toBe(acornPort.isNewLine(code));
			}
		});

		it("reads numbers like acorn", () => {
			expect(stringToNumber("010", true)).toBe(8);
			expect(stringToNumber("0777", true)).toBe(511);
			expect(stringToNumber("1e3", false)).toBe(1000);
			expect(stringToNumber("1_000.5", false)).toBe(1000.5);
		});

		it("exposes acorn's token tables", () => {
			expect(Object.keys(tokTypes).sort()).toEqual(
				Object.keys(acornPort.tokTypes).sort()
			);
			expect(Object.keys(keywordTypes).sort()).toEqual(
				Object.keys(acornPort.keywordTypes).sort()
			);
			expect(Object.keys(tokContexts).sort()).toEqual(
				Object.keys(acornPort.tokContexts).sort()
			);
		});
	});
});

const {
	Field,
	Flag,
	NodeType,
	Part,
	SyntaxTree,
	WebpackParser
} = require("../../../lib/javascript/syntax-parser");

/**
 * @param {WrittenNode} node a parsed node, some children written already
 * @returns {EstreeNode} the node as `addEstree` takes it
 */
const asEstree = (node) => /** @type {EstreeNode} */ (/** @type {unknown} */ (node));

// The options a build parses with, and the ones the minifier does.
const TREE_OPTION_SETS = [
	{
		ecmaVersion: /** @type {const} */ ("latest"),
		ranges: true,
		allowReturnOutsideFunction: true,
		allowAwaitOutsideFunction: true,
		importPhases: true
	},
	{
		ecmaVersion: /** @type {const} */ ("latest"),
		preserveParens: true,
		allowSuperOutsideMethod: true,
		importPhases: true
	}
];

const SCRIPT = fixture("javascript", "syntax-tree-rebuilds-every-node-type-the-parser-makes");

const MODULE = fixture("javascript", "syntax-tree-rebuilds-every-node-type-the-parser-makes-2");

const SKIPPED = new Set(["type", "start", "end", "range", "regex", "bigint"]);

/**
 * Writes a parsed tree into a `SyntaxTree` as a parser writing columns would.
 * @param {SyntaxTree} tree the tree
 * @param {Record<string, EXPECTED_ANY>} node the parsed node
 * @param {Set<string>} seen the types written so far
 * @returns {number} the node's id
 */
const write = (tree, node, seen) => {
	seen.add(node.type);
	const id = tree.add(
		/** @type {Record<string, number>} */ (NodeType)[node.type],
		node.start,
		node.end
	);
	for (const key of Object.keys(node)) {
		if (SKIPPED.has(key)) continue;
		const value = node[key];
		if (Array.isArray(value)) {
			tree.set(
				id,
				key,
				value.map((item) => (item === null ? null : write(tree, item, seen)))
			);
		} else if (value && typeof value === "object" && "type" in value) {
			tree.set(id, key, write(tree, value, seen));
		} else {
			tree.set(id, key, value);
		}
	}
	return id;
};

/**
 * @param {string} code the source
 * @returns {{ tree: SyntaxTree, node: number }} the tree and its first expression
 */
const writeExpression = (code) => {
	const tree = new SyntaxTree();
	const statement = /** @type {EXPECTED_ANY} */ (
		WebpackParser.parse(code, { ecmaVersion: "latest" })
	).body[0];
	return { tree, node: write(tree, statement.expression, new Set()) };
};

describe("SyntaxTree", () => {
	it("rebuilds every node type the parser makes", () => {
		/** @type {Set<string>} */
		const seen = new Set();
		const tree = new SyntaxTree();
		for (const options of TREE_OPTION_SETS) {
			for (const [code, sourceType] of [
				[SCRIPT, "script"],
				[MODULE, "module"]
			]) {
				const program = WebpackParser.parse(code, {
					...options,
					sourceType: /** @type {"script" | "module"} */ (sourceType)
				});
				tree.reset();
				const rebuilt = tree.estree(write(tree, program, seen));
				expect(firstDifference(rebuilt, program, "Program")).toBeNull();
			}
		}
		// Every type the tree knows, so a new one fails until a fixture has it.
		expect(seen.size).toBe(73);
	});

	it("writes a parsed tree whose parts were written first", () => {
		for (const options of TREE_OPTION_SETS) {
			const tree = new SyntaxTree();
			const program = /** @type {WrittenNode} */ (
				/** @type {unknown} */ (WebpackParser.parse(SCRIPT, options))
			);
			/**
			 * Writes each function body under a node first, innermost first, the
			 * body standing as its id, as a parser writing as it goes leaves it.
			 * @param {WrittenNode} node a parsed node
			 * @returns {void}
			 */
			const writeBodies = (node) => {
				for (const key of Object.keys(node)) {
					const value = node[key];
					const children = Array.isArray(value) ? value : [value];
					for (const child of children) {
						if (child && typeof child === "object" && "type" in child) {
							writeBodies(/** @type {WrittenNode} */ (child));
						}
					}
				}
				const body = /** @type {WrittenNode} */ (node.body);
				if (/Function/.test(node.type) && body.type === "BlockStatement") {
					node.body = tree.addEstree(asEstree(body));
				}
			};
			writeBodies(program);
			// A statement of a list written first stands as its id too.
			program.body = /** @type {WrittenNode[]} */ (program.body).map(
				(statement, index) =>
					index % 2 === 0 ? tree.addEstree(asEstree(statement)) : statement
			);
			const rebuilt = tree.estree(tree.addEstree(asEstree(program)));
			expect(
				firstDifference(
					rebuilt,
					WebpackParser.parse(SCRIPT, options),
					"Program"
				)
			).toBeNull();
		}
	});

	it("writes an import or export an edition before attributes parsed", () => {
		const source = fixture("javascript", "syntax-tree-writes-an-import-or-export-an-edition-before-attributes-parsed");
		const program = WebpackParser.parse(source, {
			ecmaVersion: 2020,
			sourceType: "module"
		});
		const tree = new SyntaxTree();
		const root = tree.addEstree(
			asEstree(/** @type {WrittenNode} */ (/** @type {unknown} */ (program)))
		);
		for (let i = 0; i < 3; i++) {
			const statement = tree.field(i, Field.body, root);
			expect(tree.fieldCount(Field.attributes, statement)).toBe(0);
			expect(
				/** @type {import("estree").ImportDeclaration} */ (tree.estree(statement)).attributes
			).toEqual([]);
		}
	});

	it("builds only the fields asked for, then the rest on the same object", () => {
		const { tree, node } = writeExpression(fixture("javascript", "syntax-tree-builds-only-the-fields-asked-for-then-the-rest-on-the-same-object"));
		const call = /** @type {EXPECTED_ANY} */ (
			tree.estree(node, ["callee"])
		);
		expect(call.callee.name).toBe("f");
		expect("arguments" in call).toBe(false);
		expect(tree.estree(node)).toBe(call);
		expect(
			call.arguments.map((/** @type {EXPECTED_ANY} */ arg) => arg.name)
		).toEqual(["a", "b"]);
		expect(call.optional).toBe(false);
		expect(tree.estree(node, ["callee"])).toBe(call);
		expect(call.range).toEqual([0, 7]);
		call.range = [1, 6];
		expect(call.range).toEqual([1, 6]);
	});

	it("reads a literal's regex and bigint forms when asked for alone", () => {
		const regex = writeExpression(fixture("javascript", "reg-exp-validator-rejects-and-accepts-the-same-patterns-as-acorn-at-ecma-version"));
		const literal = /** @type {EXPECTED_ANY} */ (
			regex.tree.estree(regex.node, ["regex"])
		);
		expect(literal.regex).toEqual({ pattern: "a", flags: "g" });
		expect("value" in literal).toBe(false);
		const bigint = writeExpression(fixture("javascript", "syntax-tree-reads-a-literal-s-regex-and-bigint-forms-when-asked-for-alone"));
		expect(
			/** @type {import("estree").BigIntLiteral} */ (bigint.tree.estree(bigint.node))
				.bigint
		).toBe("10");
	});

	it("clears a flag and starts over after reset", () => {
		const tree = new SyntaxTree();
		const member = tree.add(NodeType.MemberExpression, 0, 4);
		tree.set(member, "computed", true);
		tree.set(member, "computed", false);
		const before = /** @type {EXPECTED_ANY} */ (
			tree.estree(member, ["computed"])
		);
		expect(before.computed).toBe(false);
		tree.reset();
		expect(tree.add(NodeType.ThisExpression, 0, 4)).toBe(member);
		expect(tree.type(member)).toBe(NodeType.ThisExpression);
		expect(tree.estree(member)).not.toBe(before);
		expect(tree.estree(0)).toBeNull();
	});

	it("reads a field never set, or set to none, as empty", () => {
		const tree = new SyntaxTree();
		const block = tree.add(NodeType.BlockStatement, 0, 2);
		const name = tree.add(NodeType.Identifier, 0, 1);
		tree.set(name, "name", null);
		const statement = tree.add(NodeType.ExpressionStatement, 0, 2);
		tree.set(statement, "directive", undefined);
		expect(
			/** @type {import("estree").BlockStatement} */ (tree.estree(block)).body
		).toEqual([]);
		expect(
			/** @type {import("estree").Identifier} */ (tree.estree(name)).name
		).toBeNull();
		expect(
			"directive" in /** @type {import("estree").Node} */ (tree.estree(statement))
		).toBe(false);
		const literal = tree.add(NodeType.Literal, 0, 1);
		expect(tree.name(name)).toBe("");
		expect(tree.value(literal)).toBe("");
		expect(tree.textOf(Part.directive, statement)).toBeNull();
		expect(tree.fieldCount(Field.expression, statement)).toBe(0);
		// an object with a string field of none writes it as never set
		const copied = tree.addEstree(
			/** @type {EXPECTED_ANY} */ ({
				type: "Identifier",
				start: 0,
				end: 1,
				name: null
			})
		);
		expect(tree.name(copied)).toBe("");
	});

	it("writes a list of nodes written first", () => {
		const tree = new SyntaxTree();
		const items = [
			tree.addValueNode(NodeType.Identifier, 1, 2, "a"),
			tree.addValueNode(NodeType.Identifier, 4, 5, "b")
		];
		const array = tree.addNode(
			NodeType.ArrayExpression,
			0,
			6,
			0,
			tree.addList(items, 2)
		);
		expect(plain(tree.estree(array))).toEqual(
			plain(acorn.parseExpressionAt("[a, b]", 0, { ecmaVersion: "latest" }))
		);
	});

	it("writes the offsets of a node that has only a range", () => {
		const tree = new SyntaxTree();
		const program = tree.addEstree({
			type: "Program",
			range: [0, 3],
			sourceType: "script",
			body: [
				{
					type: "ExpressionStatement",
					range: [1, 3],
					expression: { type: "Identifier", range: [1, 2], name: "a" }
				}
			]
		});
		const statement = tree.field(0, Field.body, program);
		expect(tree.range(program)).toEqual([0, 3]);
		expect(tree.range(statement)).toEqual([1, 3]);
		expect(tree.range(tree.field(0, Field.expression, statement))).toEqual([
			1, 2
		]);
	});

	it("builds a tree whose parents were written before their children", () => {
		const tree = new SyntaxTree();
		const array = tree.add(NodeType.ArrayExpression, 0, 3);
		const unary = tree.add(NodeType.UnaryExpression, 0, 3);
		const name = tree.addValueNode(NodeType.Identifier, 2, 3, "a");
		tree.set(unary, "operator", "!");
		tree.set(unary, "prefix", true);
		tree.set(unary, "argument", name);
		tree.set(array, "elements", [unary]);
		const statement = tree.add(NodeType.ExpressionStatement, 0, 3);
		tree.set(statement, "expression", array);
		const object = /** @type {import("estree").ExpressionStatement} */ (
			tree.estree(statement)
		);
		const element = /** @type {import("estree").UnaryExpression} */ (
			/** @type {import("estree").ArrayExpression} */ (object.expression)
				.elements[0]
		);
		expect(/** @type {import("estree").Identifier} */ (element.argument).name).toBe(
			"a"
		);
	});

	it("builds a tree nested deeper than the call stack", () => {
		const tree = new SyntaxTree();
		let node = tree.add(NodeType.Identifier, 0, 1);
		tree.set(node, "name", "a");
		for (let i = 0; i < 100000; i++) {
			const unary = tree.add(NodeType.UnaryExpression, 0, 1);
			tree.set(unary, "operator", "!");
			tree.set(unary, "prefix", true);
			tree.set(unary, "argument", node);
			node = unary;
		}
		let object = /** @type {import("estree").Expression} */ (tree.estree(node));
		while (object.type === "UnaryExpression") object = object.argument;
		expect(/** @type {import("estree").Identifier} */ (object).name).toBe("a");
	});

	it("reads a node as the CSS and HTML paths read theirs", () => {
		const { tree, node } = writeExpression(fixture("javascript", "syntax-tree-reads-a-node-as-the-css-and-html-paths-read-theirs"));
		expect(tree.type(node)).toBe(NodeType.CallExpression);
		expect(tree.range(node)).toEqual([0, 19]);
		expect(tree.flag(Flag.optional, node)).toBe(false);
		const callee = tree.field(0, Field.callee, node);
		expect(tree.fieldCount(Field.callee, node)).toBe(1);
		expect(tree.field(1, Field.callee, node)).toBe(0);
		expect(tree.type(callee)).toBe(NodeType.MemberExpression);
		expect(tree.flag(Flag.computed, callee)).toBe(true);
		expect(tree.flag(Flag.optional, callee)).toBe(false);
		expect(tree.name(tree.field(0, Field.object, callee))).toBe("a");
		expect(tree.fieldCount(Field.arguments, node)).toBe(3);
		const regex = tree.field(1, Field.arguments, node);
		expect(tree.value(regex)).toEqual(/x/g);
		expect(tree.textOf(Part.raw, regex)).toBe("/x/g");
		expect(tree.start(regex)).toBe(8);
		expect(tree.end(regex)).toBe(12);
		expect(tree.field(3, Field.arguments, node)).toBe(0);
		expect(tree.fieldCount(Field.body, node)).toBe(0);
		expect(tree.field(0, Field.body, node)).toBe(0);
		expect(tree.name(node)).toBe("");
		expect(tree.value(node)).toBe("");
		expect(tree.textOf(Part.operator, node)).toBeNull();
		const spread = tree.field(2, Field.arguments, node);
		expect(tree.name(tree.field(0, Field.argument, spread))).toBe("c");
	});

	/**
	 * @param {SyntaxTree} tree the tree to write
	 * @param {string} source the source
	 * @returns {number} its program
	 */
	const parseInto = (tree, source) =>
		/** @type {number} */ (
			/** @type {unknown} */ (
				new WebpackParser(
					{ ecmaVersion: "latest", lazyNodes: true, syntaxTree: tree },
					source
				).parse()
			)
		);

	it("hands a small tree's columns to the next tree, cleared", () => {
		const tree = new SyntaxTree();
		parseInto(tree, "x = { a: [b, c], [d]: `e${f}` };");
		const types = tree._types;
		const values = tree._values;
		tree.release();
		expect([tree._types.length, tree._values.length, tree._listCount]).toEqual([
			0, 0, 0
		]);
		expect(values.every((value) => value === undefined)).toBe(true);
		const next = new SyntaxTree();
		expect(next._types).toBe(types);
		expect(next._values).toBe(values);
		const source = "a(b, [c]);";
		const program = parseInto(next, source);
		const fresh = new SyntaxTree();
		expect(next.estree(program)).toEqual(
			fresh.estree(parseInto(fresh, source))
		);
		next.release();
	});

	it("keeps a list's items while an item written into it grows the column", () => {
		/**
		 * @param {string} source a module
		 * @returns {[SyntaxTree, number]} its tree and program
		 */
		const parseModule = (source) => {
			const tree = new SyntaxTree();
			const program = /** @type {number} */ (
				/** @type {unknown} */ (
					new WebpackParser(
						{
							ecmaVersion: "latest",
							sourceType: "module",
							lazyNodes: true,
							syntaxTree: tree
						},
						source
					).parse()
				)
			);
			return [tree, program];
		};
		const body = `var a, b;${"a;".repeat(40000)}`;
		// Large enough to be let go, it leaves the next tree its list room exactly:
		// the body's list fits, and the export's one more name does not.
		parseModule(`${body}export { a };`)[0].release();
		const [tree, program] = parseModule(`${body}export { a, b };`);
		const last = tree.field(
			tree.fieldCount(Field.body, program) - 1,
			Field.body,
			program
		);
		expect(tree.type(last)).toBe(NodeType.ExportNamedDeclaration);
		/** @type {string[]} */
		const names = [];
		for (let i = 0; i < tree.fieldCount(Field.specifiers, last); i++) {
			const specifier = tree.field(i, Field.specifiers, last);
			names.push(tree.name(tree.field(0, Field.local, specifier)));
		}
		expect(names).toEqual(["a", "b"]);
		tree.release();
	});

	it("lets go of a large tree's columns, and the next grows to its size", () => {
		const tree = new SyntaxTree();
		parseInto(tree, "a;".repeat(40000));
		const types = tree._types;
		const nodes = tree._count;
		tree.release();
		// A runtime that transfers an ArrayBuffer frees the old one at once.
		const detached =
			typeof (
				/** @type {ArrayBuffer & { transfer?: unknown }} */ (
					new ArrayBuffer(0)
				).transfer
			) === "function";
		expect(types.byteLength === 0).toBe(detached);
		const next = new SyntaxTree();
		expect(next._types).not.toBe(types);
		next.add(NodeType.Identifier, 0, 1);
		expect(next._types.length).toBe(nodes + 1);
	});

	it("refuses an unknown type or field", () => {
		const tree = new SyntaxTree();
		expect(() => tree.add(0, 0, 1)).toThrow(/Unknown node type/);
		expect(() =>
			tree.addEstree(
				/** @type {EXPECTED_ANY} */ ({ type: "Unknown", start: 0, end: 1 })
			)
		).toThrow(/Unknown node type Unknown/);
		const node = tree.add(NodeType.Identifier, 0, 1);
		expect(() => tree.set(node, "value", 1)).toThrow(/has no field value/);
	});

	it("hands a tree's columns on to the next tree once only, and lets go of a large tree's values", () => {
		const first = new SyntaxTree();
		parseInto(first, "a(b);");
		const second = new SyntaxTree();
		parseInto(second, "c(d);");
		const types = second._types;
		first.release();
		// The spare is taken, so this tree's columns are not handed on.
		second.release();
		expect(new SyntaxTree()._types).not.toBe(types);
		const large = new SyntaxTree();
		parseInto(large, "a;".repeat(300000));
		const values = large._values;
		large.release();
		expect(new SyntaxTree()._values).not.toBe(values);
	});

	it("reads ESTree objects the way a SyntaxTree is read", () => {
		const { EstreeView } = require("../../../lib/javascript/syntax-parser");
		const view = new EstreeView();
		const program = view.add(
			/** @type {EXPECTED_ANY} */ (
				acorn.parse("x = [, a, 'b']; async () => {}", {
					ecmaVersion: "latest"
				})
			)
		);
		expect(view.type(program)).toBe(NodeType.Program);
		expect(view.fieldCount(Field.body, program)).toBe(2);
		const statement = view.field(0, Field.body, program);
		expect(view.object(statement).type).toBe("ExpressionStatement");
		const assignment = view.field(0, Field.expression, statement);
		expect(view.start(assignment)).toBe(0);
		expect(view.textOf(Part.operator, assignment)).toBe("=");
		expect(view.textOf(Part.kind, assignment)).toBeNull();
		const target = view.field(0, Field.left, assignment);
		expect(view.name(target)).toBe("x");
		expect(view.fieldCount(Field.left, assignment)).toBe(1);
		expect(view.fieldCount(Field.argument, assignment)).toBe(0);
		expect(view.field(1, Field.left, assignment)).toBe(0);
		const array = view.field(0, Field.right, assignment);
		expect(view.field(0, Field.elements, array)).toBe(0);
		const literal = view.field(2, Field.elements, array);
		expect(view.value(literal)).toBe("b");
		expect(view.name(literal)).toBe("");
		const arrow = view.field(
			0,
			Field.expression,
			view.field(1, Field.body, program)
		);
		expect(view.flag(Flag.async, arrow)).toBe(true);
		expect(view.flag(Flag.generator, arrow)).toBe(false);
		// A node placed by its range, as some parsers write it, and one of no known type.
		const ranged = view.add(
			/** @type {EXPECTED_ANY} */ ({ type: "Identifier", name: "r", range: [4, 5] })
		);
		expect(view.start(ranged)).toBe(4);
		expect(
			view.type(view.add(/** @type {EXPECTED_ANY} */ ({ type: "Unknown" })))
		).toBe(0);
		view.reset();
		expect(view.add(/** @type {EXPECTED_ANY} */ ({ type: "Super" }))).toBe(1);
		// A view after the first reads the same names.
		const other = new EstreeView();
		expect(
			other.type(other.add(/** @type {EXPECTED_ANY} */ ({ type: "Super" })))
		).toBe(NodeType.Super);
	});
});

describe("JavaScript SourceProcessor", () => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	/** @typedef {import("../../../lib/javascript/syntax-parser").JavascriptPath} JavascriptPath */

	it("walks past an array's holes, and says it walks while it does", () => {
		const {
			isWalkingSyntaxTree
		} = require("../../../lib/javascript/syntax-parser");
		/** @type {(string | boolean)[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Identifier]: (path) => {
					seen.push(path.name(), isWalkingSyntaxTree());
				}
			})
			.process(fixture("javascript", "javascript-source-processor-walks-past-an-array-s-holes-and-says-it-walks-while"), {});
		expect(seen).toEqual(["x", true, "a", true, "b", true]);
		expect(isWalkingSyntaxTree()).toBe(false);
	});

	it("reads a line's start past a lone carriage return, and moves a position along its line", () => {
		const {
			ParserPosition,
			buildLineStarts
		} = require("../../../lib/javascript/syntax-parser");
		expect(buildLineStarts("a\rb\r\nc\nd")).toEqual([0, 2, 5, 7]);
		expect(new ParserPosition(2, 3).offset(4)).toEqual(
			new ParserPosition(2, 7)
		);
	});

	it("fires enter and exit in source order, a template's parts taking turns", () => {
		/** @type {string[]} */
		const events = [];
		/**
		 * @param {string} name what the event is named
		 * @returns {{ enter: (path: JavascriptPath) => void, exit: (path: JavascriptPath) => void }} visitors recording it
		 */
		const record = (name) => ({
			enter: (path) => {
				events.push(`${name}>${path.source()}@${path.index}`);
			},
			exit: () => {
				events.push(`${name}<`);
			}
		});
		new SourceProcessor()
			.use({
				[NodeType.CallExpression]: record("call"),
				[NodeType.TemplateLiteral]: record("template")
			})
			.use([NodeType.Identifier, NodeType.TemplateElement], (path) => {
				events.push(path.source());
			})
			.process(fixture("javascript", "javascript-source-processor-fires-enter-and-exit-in-source-order-a-template-s"));
		expect(events).toEqual([
			"call>f(`a${b}c`, d)@0",
			"f",
			"template>`a${b}c`@1",
			"a",
			"b",
			"c",
			"template<",
			"d",
			"call<"
		]);
	});

	it("reads a node as the CSS and HTML paths read theirs", () => {
		const source =
			fixture("javascript", "javascript-source-processor-reads-a-node-as-the-css-and-html-paths-read-theirs");
		/** @type {Record<string, unknown>} */
		const read = {};
		new SourceProcessor()
			.use({
				[NodeType.Program]: (path) => {
					read.programParent = path.parent;
					read.childTypes = path.children().map((child) => path.type(child));
					read.childCount = path.childCount();
					read.secondChild = path.type(path.child(1));
					read.pastLastChild = path.child(9);
					read.sourceType = path.textOf(Part.sourceType);
				},
				[NodeType.ImportDeclaration]: (path) => {
					read.importSource = path.value(path.field(0, Field.source));
					read.specifiers = path.fieldCount(Field.specifiers);
					read.withoutPart = [
						path.rangeOf(Part.raw),
						path.startOf(Part.raw),
						path.endOf(Part.raw)
					];
				},
				[NodeType.MemberExpression]: (path) => {
					read.member = [
						path.flag(Flag.computed),
						path.flag(Flag.optional),
						path.within(NodeType.ForOfStatement),
						path.within(NodeType.FunctionDeclaration),
						path.type(path.parent === null ? 0 : path.parent)
					];
				},
				[NodeType.FunctionDeclaration]: (path) => {
					read.functionRange = path.range();
					read.functionStart = path.start();
					read.functionEnd = path.end();
					read.functionLoc = path.loc();
					read.functionName = path.name(path.field(0, Field.id));
					read.functionNoName = path.name();
					read.functionNoValue = path.value();
					read.param = path.type(path.fieldNamed(Field.params, "z"));
					read.noParam = path.fieldNamed(Field.params, "w");
					read.between = path.source(path.start(), path.start() + 8);
				},
				[NodeType.Identifier]: (path) => {
					if (path.name() === "z") read.state = path.state;
				}
			})
			.process(source, { state: "run" });
		expect(read).toEqual({
			programParent: null,
			childTypes: [
				NodeType.ImportDeclaration,
				NodeType.LabeledStatement,
				NodeType.FunctionDeclaration
			],
			childCount: 3,
			secondChild: NodeType.LabeledStatement,
			pastLastChild: 0,
			sourceType: "module",
			importSource: "y",
			specifiers: 1,
			withoutPart: [null, -1, -1],
			member: [true, true, true, false, NodeType.ChainExpression],
			functionRange: [53, 93],
			functionStart: 53,
			functionEnd: 93,
			functionLoc: [3, 0, 3, 40],
			functionName: "f",
			functionNoName: "",
			functionNoValue: "",
			param: NodeType.Identifier,
			noParam: 0,
			between: "function",
			state: "run"
		});
	});

	it("skips a node's children, stops, and fires every visitor on the next run", () => {
		/** @type {string[]} */
		const names = [];
		const processor = new SourceProcessor().use({
			[NodeType.FunctionDeclaration]: (path) => path.skipChildren(),
			[NodeType.Identifier]: (path) => {
				names.push(path.name());
				if (path.name() === "stop") path.stop();
			}
		});
		processor.process(fixture("javascript", "javascript-source-processor-skips-a-node-s-children-stops-and-fires-every"));
		processor.process(fixture("javascript", "javascript-source-processor-skips-a-node-s-children-stops-and-fires-every-2"));
		expect(names).toEqual(["c", "stop", "e"]);
	});

	it("reads a script as a script, and refuses a walk inside a walk", () => {
		/** @type {number[]} */
		const types = [];
		const processor = new SourceProcessor().use({
			[NodeType.WithStatement]: (path) => {
				types.push(path.type());
				expect(() => processor.process(fixture("javascript", "javascript-source-processor-reads-a-script-as-a-script-and-refuses-a-walk-inside"))).toThrow(/already running/);
			}
		});
		processor.process(fixture("javascript", "javascript-source-processor-reads-a-script-as-a-script-and-refuses-a-walk"), { sourceType: "script" });
		expect(types).toEqual([NodeType.WithStatement]);
		expect(() => processor.process(fixture("javascript", "javascript-source-processor-reads-a-script-as-a-script-and-refuses-a-walk"))).toThrow(SyntaxError);
		expect(() => processor.process(fixture("javascript", "javascript-source-processor-reads-a-script-as-a-script-and-refuses-a-walk-inside"))).not.toThrow();
	});
});

describe("WebpackParser writing a SyntaxTree", () => {
	const {
		SyntaxTree,
		WebpackParser
	} = require("../../../lib/javascript/syntax-parser");

	/** @type {import("../../../lib/javascript/syntax-parser").ParserOptions} */
	const options = {
		ecmaVersion: "latest",
		sourceType: "module",
		lazyNodes: true,
		preserveParens: true
	};

	/**
	 * @param {string} source the source
	 * @returns {{ tree: InstanceType<typeof SyntaxTree>, program: number }} the tree and its program
	 */
	const parseIntoTree = (source) => {
		const tree = new SyntaxTree();
		const program = /** @type {number} */ (
			/** @type {unknown} */ (
				new WebpackParser({ ...options, syntaxTree: tree }, source).parse()
			)
		);
		return { tree, program };
	};

	/**
	 * @param {unknown} node a node and everything under it
	 * @returns {unknown} the same as JSON, a bigint and a regular expression as text
	 */
	const plain = (node) =>
		JSON.parse(
			JSON.stringify(node, (key, value) =>
				typeof value === "bigint"
					? `${value}n`
					: value instanceof RegExp
						? String(value)
						: value
			)
		);

	it.each([
		'"use strict"; let { a, b: [c = 1, ...d], ...e } = f; (g) = h, i += 2;',
		"class A extends B { static #x = 1; get y() { return super.y } static { var z } }",
		"for (const [k, v] of m) label: for (x in y) continue label;",
		"x = a ? b?.c(...d) : new E(`t${f}u`, /re/g, 10n);",
		"async function* g(p = 1, { q }) { yield* await r; }",
		"switch (s) { case 1: t(); default: }",
		"try { u() } catch ({ v }) {} finally { w() }",
		'import a, { b as c } from "d"; export { c }; export default (e) => e;',
		"export const { f, g: [h] } = i; import.meta;",
		"({ ...j, k, [l]: m, n() {}, get o() { return 1 } }); [, p, ...q] = r;"
	])("writes %s as the objects it would build otherwise", (source) => {
		const { tree, program } = parseIntoTree(source);
		expect(plain(tree.estree(program))).toEqual(
			plain(new WebpackParser(options, source).parse())
		);
	});

	it("parses into a tree unless asked for ESTree, read as the last parse", () => {
		const {
			NodeType,
			parseProgram,
			parsedTree,
			toEstreeObject
		} = require("../../../lib/javascript/syntax-parser");
		const source = fixture("javascript", "webpack-parser-writing-a-syntax-tree-parses-into-a-tree-unless-asked-for-estree");
		const expected = plain(parseProgram(source, 0, { estree: true }));
		const program = parseProgram(source);
		const tree =
			/** @type {InstanceType<typeof SyntaxTree>} */ (parsedTree());
		expect(tree.type(program)).toBe(NodeType.Program);
		expect(plain(toEstreeObject(program))).toEqual(expected);
		expect(plain(tree.estree(program))).toEqual(expected);
		expect(toEstreeObject(0)).toBeNull();
	});

	it("builds the same objects whether the program or a part of it is asked for first", () => {
		const { Field } = require("../../../lib/javascript/syntax-parser");
		const source = "x = /re/g + 10n; if (y) { z(1, 2, 3, 4, [, 5]); }";
		const whole = parseIntoTree(source);
		const program = /** @type {import("estree").Program} */ (
			whole.tree.estree(whole.program)
		);
		const statement = whole.tree.field(1, Field.body, whole.program);
		expect(whole.tree.estree(statement)).toBe(program.body[1]);
		const expected = plain(new WebpackParser(options, source).parse());
		expect(plain(program)).toEqual(expected);
		const partFirst = parseIntoTree(source);
		const part = partFirst.tree.estree(partFirst.tree.field(1, Field.body, partFirst.program)
		);
		const rest = /** @type {import("estree").Program} */ (
			partFirst.tree.estree(partFirst.program)
		);
		expect(rest.body[1]).toBe(part);
		expect(plain(rest)).toEqual(expected);
	});

	it.each([
		'let a, c; function n() { new.target; } import.meta.url; export { a as b, c }; export * as d from "e";',
		'import f, { g as h } from "i"; ({ j: 1, k }); switch (l) { case 1: m; }'
	])("writes every child of %s before its parent", (source) => {
		const { Field } = require("../../../lib/javascript/syntax-parser");
		const { tree } = parseIntoTree(source);
		/** @type {string[]} */
		const later = [];
		for (let node = 1; node <= tree._count; node++) {
			for (const field of Object.values(Field)) {
				for (let i = 0, n = tree.fieldCount(field, node); i < n; i++) {
					const child = tree.field(i, field, node);
					if (child >= node) later.push(`${node} -> ${child}`);
				}
			}
		}
		expect(later).toEqual([]);
	});

	it("writes a node acorn shares between two fields once per field", () => {
		const { Field } = require("../../../lib/javascript/syntax-parser");
		const { tree } = parseIntoTree('import { x } from "m"; let y; export { y };');
		/** @type {Map<number, number>} */
		const parents = new Map();
		/** @type {string[]} */
		const shared = [];
		for (let node = 1; node <= tree._count; node++) {
			for (const field of Object.values(Field)) {
				for (let i = 0, n = tree.fieldCount(field, node); i < n; i++) {
					const child = tree.field(i, field, node);
					if (child === 0) continue;
					if (parents.has(child)) shared.push(`${child} in ${node}`);
					parents.set(child, node);
				}
			}
		}
		expect(shared).toEqual([]);
	});

	it("writes an import or export a loop runs, where they are allowed everywhere", () => {
		for (const source of [
			'for (;;) import a from "b";',
			"while (x) export const c = 1;",
			"let d; for (d of e) export { d };"
		]) {
			const everywhere = { ...options, allowImportExportEverywhere: true };
			const tree = new SyntaxTree();
			const program = /** @type {number} */ (
				/** @type {unknown} */ (
					new WebpackParser({ ...everywhere, syntaxTree: tree }, source).parse()
				)
			);
			expect(plain(tree.estree(program))).toEqual(
				plain(new WebpackParser(everywhere, source).parse())
			);
		}
	});

	it.each([
		"({ ...{ a } } = b);",
		fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-501"),
		fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-502"),
		fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-503"),
		fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-512"),
		"[f()] = b;",
		"(a, a) => 1;",
		fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-530"),
		"({ a: b.c }) => 1;",
		"for ((a?.b) of c);",
		"for (using a = b in c);"
	])("refuses %s as it does otherwise", (source) => {
		/** @type {string | undefined} */
		let message;
		try {
			new WebpackParser(options, source).parse();
		} catch (err) {
			message = /** @type {Error} */ (err).message;
		}
		expect(message).toBeDefined();
		expect(() => parseIntoTree(source)).toThrow(/** @type {string} */ (message));
	});

	it("refuses a tree where its productions would be acorn's", () => {
		expect(
			() =>
				new WebpackParser(
					{ ...options, ecmaVersion: 2015, syntaxTree: new SyntaxTree() },
					"x"
				)
		).toThrow(/latest edition only/);
	});
});

describe("parseProgram", () => {
	const { A, NodeType, Part, parseProgram } = require("../../../lib/javascript/syntax-parser");
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	/** @typedef {[string, string, string, string]} ReportedError */

	/**
	 * @param {string} source the program
	 * @param {import("../../../lib/javascript/syntax-parser").JavascriptParseOptions=} options what to read it as
	 * @returns {{ program: number | undefined, errors: ReportedError[] }} its node and each reported error's code, text and severity
	 */
	const collect = (source, options = {}) => {
		/** @type {ReportedError[]} */
		const errors = [];
		const program = parseProgram(source, 0, {
			...options,
			parseError: (input, code, start, end, severity) => {
				errors.push([code, input.slice(start, end), severity, String(start)]);
			}
		});
		return { program, errors };
	};

	it("returns the program's node, read through A until the next parse", () => {
		const program = /** @type {number} */ (parseProgram(fixture("javascript", "parse-program-returns-the-program-s-node-read-through-a-until-the-next-parse")));
		expect(A.type(program)).toBe(NodeType.Program);
		expect(A.children(program).map((node) => A.type(node))).toEqual([
			NodeType.VariableDeclaration,
			NodeType.ExpressionStatement
		]);
		const call = A.child(0, A.child(1, program));
		expect(A.source(call)).toBe("f(a)");
		expect(A.loc(call)).toEqual([1, 11, 1, 15]);
		parseProgram(fixture("javascript", "parse-program-returns-the-program-s-node-read-through-a-until-the-next-parse-2"));
		expect(A.source(A.child(0, program))).toBe("g()");
	});

	it("starts at the offset given", () => {
		const program = /** @type {number} */ (parseProgram(fixture("javascript", "parse-program-starts-at-the-offset-given"), 5));
		expect(A.source(A.child(0, program))).toBe("def;");
	});

	it("reads a script where asked", () => {
		expect(collect(fixture("javascript", "parse-program-reads-a-script-where-asked"), { sourceType: "script" }).errors).toEqual([]);
		expect(collect(fixture("javascript", "parse-program-reads-a-script-where-asked")).errors).toEqual([
			["strict-with", "with", "error", "0"]
		]);
	});

	it.each([
		["module", fixture("javascript", "parse-program-reads-a-source-as-module-import-x-from-y-await-x"), []],
		["module", fixture("javascript", "parse-program-reads-a-source-as-module-return-1"), [["illegal-return", fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-13"), "error", "0"]]],
		["script", fixture("javascript", "parse-program-reads-a-source-as-script-await-1-with-a"), []],
		["script", fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-3"), [["unexpected-new-target", "new", "warning", "0"]]],
		[
			"script",
			fixture("javascript", "parse-program-reads-a-source-as-script-import-x-from-y"),
			[["import-outside-module", "import", "error", "0"]]
		],
		// A function's body: `return` and `new.target` at its top, sloppy, and
		// `await` and `yield` names, as in a function neither async nor generator.
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-event-handler-if-a-return-new-target-await-yield"),
			[]
		],
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-event-handler-use-strict-with-a"),
			[["strict-with", "with", "error", "14"]]
		],
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-event-handler-let-a-var-a"),
			[["var-redeclaration", "a", "warning", "11"]]
		],
		["event-handler", fixture("javascript", "parse-program-reads-a-source-as-event-handler-super-x"), [["unexpected-super", fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-14"), "error", "0"]]],
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-script-import-x-from-y"),
			[["import-outside-module", "import", "error", "0"]]
		],
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-event-handler-export"),
			[["import-outside-module", "export", "error", "0"]]
		],
		// A CommonJS module is a function's body too, which a `#!` line may open.
		["commonjs", fixture("javascript", "parse-program-reads-a-source-as-commonjs-x-nif-a-return-new-target-await-1"), []],
		[
			"commonjs",
			fixture("javascript", "parse-program-reads-a-source-as-script-import-x-from-y"),
			[["import-outside-module", "import", "error", "0"]]
		],
		[
			"commonjs",
			fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite"),
			[["import-meta-outside-module", "import", "warning", "0"]]
		],
		// A handler is never a module: what only a module may hold stays out.
		[
			"event-handler",
			fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite"),
			[["import-meta-outside-module", "import", "warning", "0"]]
		],
		// Only a script, a module or a CommonJS module opens with a `#!` line.
		[
			"event-handler",
			fixture("javascript", "parse-program-reads-a-source-as-event-handler-x-n1"),
			[["invalid-or-unexpected-token", "!", "error", "1"]]
		],
		["module", fixture("javascript", "parse-program-reads-a-source-as-event-handler-x-n1"), []]
	])("reads a source as %s: %j", (sourceType, source, expected) => {
		const { program, errors } = collect(source, {
			sourceType:
				/** @type {import("../../../lib/javascript/syntax-parser").JavascriptSourceType} */ (
					sourceType
				)
		});
		expect(errors).toEqual(expected);
		expect(program === undefined).toBe(
			expected.some(([, , severity]) => severity === "error")
		);
	});

	it("reads import phases", () => {
		const { program, errors } = collect(
			fixture("javascript", "parse-program-reads-import-phases")
		);
		expect(errors).toEqual([]);
		const [deferred, source] = A.children(/** @type {number} */ (program));
		expect(A.textOf(Part.phase, deferred)).toBe("defer");
		expect(A.textOf(Part.phase, source)).toBe("source");
		expect(collect(fixture("javascript", "parse-program-reads-import-phases-2"), { sourceType: "script" }).errors).toEqual(
			[]
		);
		expect(collect(fixture("javascript", "parse-program-reads-import-phases-3")).errors).toEqual([
			["defer-import-requires-namespace", "defer", "warning", "7"]
		]);
	});

	it.each([
		[fixture("javascript", "parse-program-stops-at-a-returning-nothing"), ["unexpected-token", "~", "error", "2"]],
		[fixture("javascript", "parse-program-reads-a-source-as-module-return-1"), ["illegal-return", fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-13"), "error", "0"]],
		[fixture("javascript", "parse-program-stops-at-b-returning-nothing"), ["unterminated-template", "", "error", "5"]],
		// No token to read where these are: an empty range, as at end of input.
		[fixture("javascript", "parse-program-stops-at-throw-n1-returning-nothing"), ["newline-after-throw", "", "error", "5"]],
		[fixture("javascript", "parse-program-stops-at-041-returning-nothing"), ["missing-unicode-escape", "", "error", "2"]],
		// Raised while skipping to the next token, not inside the last one.
		[fixture("javascript", "parse-program-stops-at-a-returning-nothing-2"), ["unterminated-comment", "", "error", "2"]]
	])("stops at %j, returning nothing", (source, error) => {
		const { program, errors } = collect(source);
		expect(program).toBeUndefined();
		expect(errors).toEqual([error]);
	});

	it.each([
		[fixture("javascript", "parse-program-reads-past-let-a-let-a"), ["var-redeclaration", "a", "warning", "11"]],
		[fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-15"), ["invalid-regular-expression", "(/", "warning", "1"]],
		[fixture("javascript", "parse-program-reads-past-class-a-a-a"), ["private-name-redeclaration", "#a", "warning", "14"]],
		[fixture("javascript", "parse-program-reads-past-class-a-set-x"), ["bad-setter-arity", "(", "warning", "15"]],
		[
			fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-16"),
			["duplicate-proto", "__proto__", "warning", "17"]
		],
		[
			fixture("javascript", "parse-program-reads-past-export-a-as-x-b-as-x-var-a-b"),
			["duplicate-export", '"x"', "warning", "24"]
		]
	])("reads past %j", (source, error) => {
		const { program, errors } = collect(source);
		expect(program).toBeDefined();
		expect(errors).toEqual([error]);
	});

	it("reports every error the parse reads past, once each", () => {
		const { program, errors } = collect(fixture("javascript", "parse-program-reports-every-error-the-parse-reads-past-once-each"));
		expect(program).toBeDefined();
		expect(errors.map(([code, , , start]) => `${code}@${start}`)).toEqual([
			"var-redeclaration@11",
			"var-redeclaration@18",
			"invalid-regular-expression@22",
			"invalid-regular-expression@27"
		]);
		expect(collect(fixture("javascript", "parse-program-reports-every-error-the-parse-reads-past-once-each-2")).errors).toHaveLength(1);
		// Two faults in one pattern: the validator raises both at its start.
		expect(collect(fixture("javascript", "parse-program-reports-every-error-the-parse-reads-past-once-each-3")).errors).toEqual([
			["invalid-regular-expression", "(?<a>)(?<a>)(/", "warning", "1"]
		]);
	});

	it("names an error whose message holds a line terminator", () => {
		const { program, errors } = collect(
			fixture("javascript", "parse-program-names-an-error-whose-message-holds-a-line-terminator"),
			{ sourceType: "module" }
		);
		expect(program).toBeDefined();
		expect(errors.map(([code]) => code)).toEqual(["duplicate-export"]);
	});

	it("reads a build's options: ESTree, comments, auto, a top-level return", () => {
		/** @type {import("../../../lib/javascript/syntax-parser").CollectedComment[]} */
		const comments = [];
		const program = parseProgram(fixture("javascript", "parse-program-reads-a-build-s-options-estree-comments-auto-a-top-level-return"), 0, {
			estree: true,
			comments
		});
		expect(program.type).toBe("Program");
		expect(program.body[0].type).toBe("ImportDeclaration");
		expect(comments.map((comment) => comment.value)).toEqual([" a "]);
		const auto = parseProgram(fixture("javascript", "parse-program-reads-a-build-s-options-estree-comments-auto-a-top-level-return-2"), 0, {
			sourceType: "auto",
			estree: true
		});
		expect(auto.sourceType).toBe("script");
		expect(() => parseProgram(fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-111"), 0, { sourceType: "script" })).toThrow(
			"'return' outside of function"
		);
		expect(
			parseProgram(fixture("javascript", "parser-parses-like-acorn-for-every-program-as-script-latest-111"), 0, {
				sourceType: "script",
				allowReturnOutsideFunction: true,
				estree: true
			}).body[0].type
		).toBe("ReturnStatement");
		expect(() =>
			parseProgram(fixture("javascript", "parse-program-reads-a-build-s-options-estree-comments-auto-a-top-level-return-3"), 0, { importPhases: false })
		).toThrow(SyntaxError);
		expect(typeof parseProgram(fixture("javascript", "parse-program-reads-a-build-s-options-estree-comments-auto-a-top-level-return-3"))).toBe("number");
	});

	it("reads every grammar option into the tree as acorn reads it", () => {
		/** @typedef {Pick<import("acorn").Options, "strict" | "allowReserved" | "allowHashBang" | "allowImportExportEverywhere" | "allowAwaitOutsideFunction" | "allowSuperOutsideMethod" | "checkPrivateFields">} GrammarOptions */
		/** @type {[string, "script" | "module", GrammarOptions, GrammarOptions][]} */
		const cases = [
			[fixture("javascript", "parse-program-reads-a-script-where-asked"), "script", { strict: true }, { strict: false }],
			[fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it"), "script", { allowReserved: "never" }, { allowReserved: true }],
			[fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it-2"), "script", { allowReserved: false }, { allowReserved: true }],
			[fixture("javascript", "parse-program-reads-a-source-as-event-handler-x-n1"), "script", { allowHashBang: false }, { allowHashBang: true }],
			[
				fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it-3"),
				"module",
				{ allowImportExportEverywhere: true },
				{ allowImportExportEverywhere: false }
			],
			[
				fixture("javascript", "acorn-corpus-the-parser-a-build-runs-builds-acorn-s-tree-as-acorn-s-own-suite-17"),
				"script",
				{ allowAwaitOutsideFunction: true },
				{ allowAwaitOutsideFunction: false }
			],
			[
				fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it-4"),
				"script",
				{ allowSuperOutsideMethod: true },
				{ allowSuperOutsideMethod: false }
			],
			[
				fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it-5"),
				"script",
				{ checkPrivateFields: false },
				{ checkPrivateFields: true }
			]
		];
		/**
		 * @param {() => unknown} parse the parse
		 * @returns {string} its outcome: `ok`, or the error it throws
		 */
		const outcome = (parse) => {
			try {
				parse();
				return "ok";
			} catch (error) {
				return /** @type {Error} */ (error).message;
			}
		};
		for (const [code, sourceType, on, off] of cases) {
			const results = [on, off].map((options) => [
				outcome(() => parseProgram(code, 0, { sourceType, ...options })),
				outcome(() =>
					acorn.parse(code, { ...options, ecmaVersion: "latest", sourceType })
				)
			]);
			// each case is one the option decides, and the tree reads it as acorn
			expect([code, results[0][1] === results[1][1]]).toEqual([code, false]);
			expect([code, results[0][0], results[1][0]]).toEqual([
				code,
				results[0][1],
				results[1][1]
			]);
		}
		const tree = parseProgram(fixture("javascript", "parse-program-reads-every-grammar-option-into-the-tree-as-acorn-reads-it-6"), 0, {
			sourceType: "script",
			preserveParens: true
		});
		expect(A.type(A.field(0, Field.expression, A.field(0, Field.body, tree)))).toBe(
			NodeType.ParenthesizedExpression
		);
	});

	it("reports tokens and the parse's events into the tree as acorn does", () => {
		const code = fixture("javascript", "parse-program-reports-tokens-and-the-parse-s-events-into-the-tree-as-acorn-does");
		/** @type {unknown[]} */
		const tokens = [];
		/** @type {unknown[]} */
		const events = [];
		let read = 0;
		/** @type {import("acorn").Options} */
		const callbacks = {
			ecmaVersion: "latest",
			onToken: (token) => tokens.push([token.type.label, token.start, token.end]),
			onComment: (block, text, start) => events.push(["comment", text, start]),
			onInsertedSemicolon: (end) => events.push(["semicolon", end]),
			onTrailingComma: (end) => events.push(["comma", end])
		};
		parseProgram(code, 0, {
			.../** @type {import("../../../lib/javascript/syntax-parser").JavascriptParseOptions} */ (
				/** @type {unknown} */ (callbacks)
			),
			sourceType: "script",
			onTokenRead: () => read++
		});
		const tree = [tokens.splice(0), events.splice(0)];
		acorn.parse(code, { ...callbacks, sourceType: "script" });
		expect(tokens.length).toBeGreaterThan(0);
		expect(tree).toEqual([tokens, events]);
		expect(read).toBe(tokens.length);
	});

	it("collects comments and reports them to `onComment` in one parse", () => {
		for (const estree of [false, true]) {
			/** @type {import("../../../lib/javascript/syntax-parser").CollectedComment[]} */
			const comments = [];
			/** @type {unknown[]} */
			const reported = [];
			parseProgram(fixture("javascript", "parse-program-collects-comments-and-reports-them-to-on-comment-in-one-parse"), 0, {
				sourceType: "script",
				estree,
				comments,
				onComment: (block, text, start, end) =>
					reported.push([block, text, start, end])
			});
			expect(comments.map((comment) => comment.value)).toEqual([
				"x",
				" a ",
				" c"
			]);
			expect(reported).toEqual([
				[false, "x", 0, 3],
				[true, " a ", 4, 11],
				[false, " c", 15, 19]
			]);
		}
	});

	it("refuses an ESTree parse a visitor starts, as a tree parse", () => {
		expect(() =>
			new SourceProcessor()
				.use([NodeType.Identifier], () => {
					parseProgram(fixture("javascript", "parse-program-refuses-an-estree-parse-a-visitor-starts-as-a-tree-parse"), 0, { estree: true });
				})
				.process(fixture("javascript", "parse-program-lets-the-last-tree-go-once-an-estree-parse-starts"), { sourceType: "script" })
		).toThrow("a visitor cannot start another JavaScript parse");
	});

	it("lets the last tree go once an ESTree parse starts", () => {
		const { parsedTree } = require("../../../lib/javascript/syntax-parser");
		parseProgram(fixture("javascript", "parse-program-lets-the-last-tree-go-once-an-estree-parse-starts"));
		expect(parsedTree()).not.toBeNull();
		parseProgram(fixture("javascript", "parse-program-refuses-an-estree-parse-a-visitor-starts-as-a-tree-parse"), 0, { estree: true });
		expect(parsedTree()).toBeNull();
	});

	it("turns `auto` into a script at a return it allows anyway", () => {
		const program = parseProgram(fixture("javascript", "webpack-parser-statements-should-parse-if-else-chains-and-returns-on-the-fast-2"), 0, {
			sourceType: "auto",
			allowReturnOutsideFunction: true,
			estree: true
		});
		expect(program.sourceType).toBe("script");
	});

	it("reads `await` as a name once `auto` turns into a script", () => {
		for (const code of [
			fixture("javascript", "parse-program-reads-await-as-a-name-once-auto-turns-into-a-script"),
			fixture("javascript", "parse-program-reads-await-as-a-name-once-auto-turns-into-a-script-2")
		]) {
			expect(parseProgram(code, 0, { sourceType: "auto" })).toEqual(
				expect.any(Number)
			);
		}
	});

	it("throws the first error without a callback, as acorn does", () => {
		expect(() => parseProgram(fixture("javascript", "parse-program-reads-past-let-a-let-a"))).toThrow(
			"Identifier 'a' has already been declared (1:11)"
		);
		expect(() => parseProgram(fixture("javascript", "parse-program-stops-at-a-returning-nothing"))).toThrow(SyntaxError);
		expect(parseProgram(fixture("javascript", "parse-program-stops-at-a-returning-nothing"), 0, { parseError: () => {} })).toBeUndefined();
	});

	it("rethrows a syntax error the callback throws", () => {
		expect(() =>
			parseProgram(fixture("javascript", "parse-program-reads-past-let-a-let-a"), 0, {
				parseError: () => {
					throw new SyntaxError("callback");
				}
			})
		).toThrow("callback");
	});

	it("refuses a parse started from its own callback", () => {
		/** @type {string[]} */
		const codes = [];
		expect(() =>
			parseProgram(fixture("javascript", "parse-program-reads-past-let-a-let-a"), 0, {
				parseError: (input, code) => {
					codes.push(code);
					parseProgram(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"));
				}
			})
		).toThrow("parseProgram() is running");
		expect(codes).toEqual(["var-redeclaration"]);
	});

	it("rethrows what is not a syntax error", () => {
		expect(() =>
			parseProgram(fixture("javascript", "parse-program-lets-the-last-tree-go-once-an-estree-parse-starts"), 0, {
				parseError: () => {
					throw new TypeError("callback");
				},
				sourceType: "script"
			})
		).not.toThrow();
		expect(() =>
			parseProgram(fixture("javascript", "parse-program-reads-past-let-a-let-a"), 0, {
				parseError: () => {
					throw new TypeError("callback");
				}
			})
		).toThrow(TypeError);
	});

	it("leaves the parsed tree to a SourceProcessor run, and refuses one inside it", () => {
		parseProgram(fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at-3"));
		/** @type {number[]} */
		const seen = [];
		new SourceProcessor()
			.use({
				[NodeType.Identifier]: (path) => {
					seen.push(path.start());
					expect(() => parseProgram(fixture("javascript", "parser-static-entry-points-normalizes-options-like-acorn"))).toThrow(/process\(\) is running/);
				}
			})
			.process(fixture("javascript", "parse-program-leaves-the-parsed-tree-to-a-source-processor-run-and-refuses-one"));
		expect(seen).toEqual([0, 4]);
		const program = /** @type {number} */ (parseProgram(fixture("javascript", "parse-program-leaves-the-parsed-tree-to-a-source-processor-run-and-refuses-one-2")));
		expect(A.source(program)).toBe("z");
	});
});

describe("hasOctalEscape", () => {
	const { hasOctalEscape } = require("../../../lib/javascript/syntax-parser");

	it.each([
		["'\\1'", true],
		["'\\01'", true],
		["'a\\7b'", true],
		["'\\0'", false],
		["'\\0a'", false],
		["'\\\\1'", false],
		["'\\n\\x41'", false],
		["'plain'", false]
	])("reads %s as holding a legacy octal escape: %s", (raw, expected) => {
		expect(hasOctalEscape(raw)).toBe(expected);
	});
});

describe("validateRegExpLiteral", () => {
	const {
		validateRegExpLiteral
	} = require("../../../lib/javascript/regexp");

	it.each(
		/** @type {[string, string, import("../../../lib/javascript/syntax-parser").EcmaVersion, string | undefined][]} */ ([
			["a+", "g", 2018, undefined],
			["(?<a>x)\\k<a>", "", 2018, undefined],
			["(?<a>x)", "", 2017, "Invalid group"],
			["a", "gg", 2018, "Duplicate regular expression flag"],
			["[a-z]", "v", 2018, "Invalid regular expression flag"],
			["\\p{L}", "u", 2018, undefined],
			["(", "", "latest", "Unterminated group"],
			["[", "g", 2018, "Unterminated regular expression"],
			["a\\", "", 2018, "Unterminated regular expression"],
			["a/b", "", 2018, "Unterminated regular expression"],
			["[/]", "", 2018, undefined],
			[fixture("javascript", "webpack-parser-automatic-semicolon-insertion-should-keep-splitting-statements-at"), "", 2018, "Unterminated regular expression"]
		])
	)("holds /%s/%s at %s to the spec", (pattern, flags, ecmaVersion, error) => {
		const validate = () => validateRegExpLiteral(pattern, flags, ecmaVersion);
		if (error === undefined) expect(validate).not.toThrow();
		else expect(validate).toThrow(error);
	});
});
