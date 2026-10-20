"use strict";

/** @typedef {import("../../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/** @typedef {import("../../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */
/** @typedef {{ ast: import("estree").Program, comments: CollectedComment[] }} ParseResult */

const { parse: webpackParse } = require("../../../lib/javascript/syntax").parser;

/**
 * Parse with the options a build hands the parser: ranges alone become lazy
 * offsets, and comments are collected lazily or eagerly to match.
 * @param {string} code source
 * @param {object=} options extra parse options, plus `comments` to collect them
 * @returns {ParseResult} result
 */
const parse = (code, options) => {
	const { comments: collectComments, ...rest } =
		/** @type {ParserOptions & { comments?: boolean }} */ ({
			sourceType: "script",
			ecmaVersion: "latest",
			comments: true,
			ranges: true,
			allowHashBang: true,
			...options
		});
	/** @type {CollectedComment[]} */
	const comments = [];
	const lazyNodes = rest.ranges === true && rest.locations !== true;
	/** @type {ParserOptions} */
	const parserOptions = {
		allowReturnOutsideFunction: rest.sourceType === "script",
		...rest,
		ranges: lazyNodes ? false : rest.ranges,
		lazyNodes
	};
	if (collectComments === true) {
		if (lazyNodes) parserOptions.lazyComments = comments;
		else parserOptions.onComment = comments;
	}
	return { ast: webpackParse(code, parserOptions), comments };
};

describe("WebpackParser", () => {

	describe("token context (finishToken exprAllowed)", () => {
		/**
		 * @param {string} code source
		 * @returns {string} the sole expression's node type
		 */
		const exprType = (code) => {
			const statement =
				/** @type {import("estree").ExpressionStatement} */
				(parse(code).ast.body[0]);
			return statement.expression.type;
		};

		it("should classify braces as blocks or objects like acorn", () => {
			// colon in block vs object context, nested blocks, function bodies
			const { ast } = parse(
				"foo: { bar(); } x = { a: { b: 1 } }; { { } } y = function () { return 1; };"
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"LabeledStatement",
				"ExpressionStatement",
				"BlockStatement",
				"ExpressionStatement"
			]);
			// a line terminator after `return` turns the brace into a block
			const returned =
				/** @type {import("estree").FunctionDeclaration} */
				(parse("function f() { return {}; }").ast.body[0]);
			const ret = /** @type {import("estree").ReturnStatement} */ (
				returned.body.body[0]
			);
			expect(/** @type {import("estree").Node} */ (ret.argument).type).toBe(
				"ObjectExpression"
			);
			const broken =
				/** @type {import("estree").FunctionDeclaration} */
				(parse("function f() { return\n{}; }").ast.body[0]);
			expect(
				/** @type {import("estree").ReturnStatement} */ (broken.body.body[0])
					.argument
			).toBeNull();
			// a stray closer still pops safely before the parser rejects it
			expect(() => parse("}")).toThrow(/Unexpected token/);
		});

		it("should read `/` after a value as division, not a regexp", () => {
			// the `else` branch: exprAllowed follows the token type's beforeExpr
			expect(exprType("a / b / c")).toBe("BinaryExpression");
			expect(exprType("1 / 2")).toBe("BinaryExpression");
			expect(exprType("(1 / n) ** (1 / 2)")).toBe("BinaryExpression");
			expect(exprType("a.b / c")).toBe("BinaryExpression");
			expect(exprType("a[b] / c")).toBe("BinaryExpression");
			expect(exprType("f() / 2")).toBe("BinaryExpression");
		});

		it("should read `/` where an expression is allowed as a regexp", () => {
			// the updateContext branch (parenR pop) and value-position defaults
			expect(exprType("x = /re/g")).toBe("AssignmentExpression");
			expect(parse("if (a) /re/.test(b);").ast).toBeDefined();
			expect(parse("function f() { return /re/; }").ast).toBeDefined();
			expect(
				// eslint-disable-next-line no-template-curly-in-string
				parse("var t = `${1 / 2}${/re/.source}`;").ast
			).toBeDefined();
		});

		it("should keep `/` after a keyword-valued property name as division", () => {
			// keyword-after-dot forbids an expression, so the next `/` divides
			expect(parse("a.in / b; a.of / c;").ast).toBeDefined();
		});

		it("should re-allow an expression after `of` and generator `yield`", () => {
			// the inlined name.updateContext true branches: the `/` lexes a regexp
			expect(parse("for (x of /re/g);").ast).toBeDefined();
			expect(parse("function* g() { yield /re/g; }").ast).toBeDefined();
		});

		it("should read multi-char `.` and `=` tokens in the owned scanner", () => {
			// `...`, `==`, `===` and `=>` miss the single-char dispatch fast paths
			expect(exprType("f(...a)")).toBe("CallExpression");
			expect(exprType("a == b")).toBe("BinaryExpression");
			expect(exprType("a === b")).toBe("BinaryExpression");
			expect(exprType("(x) => x")).toBe("ArrowFunctionExpression");
		});
	});

	describe("newline-before-token tracking", () => {
		it("should apply ASI from the flag without a gap scan", () => {
			expect(parse("a\nb;").ast.body).toHaveLength(2);
			expect(() => parse("a b;")).toThrow(/Unexpected token/);
			// postfix `++` on the next line binds to the next statement
			expect(parse("a\n++b;").ast.body).toHaveLength(2);
		});

		it("should fall back to the gap scan around comments", () => {
			// line terminator hidden inside a block comment still triggers ASI
			expect(parse("a /* \n */ b;").ast.body).toHaveLength(2);
			expect(() => parse("a /* x */ b;")).toThrow(/Unexpected token/);
			// unicode whitespace defers to acorn's skipSpace, then the scan
			expect(parse("a \u2028 b;").ast.body).toHaveLength(2);
			expect(() => parse("a \u00A0 b;")).toThrow(/Unexpected token/);
		});

		it("should keep ASI working inside template expression gaps", () => {
			// tokens after a template chunk come from acorn's tokenizer (flag
			// unknown), so the scan fallback decides
			// eslint-disable-next-line no-template-curly-in-string
			expect(parse("f`${a\n}`;").ast.body).toHaveLength(1);
		});

		it("should keep a seen line terminator across unicode whitespace", () => {
			// LF before a NBSP: the flag stays "yes" through acorn's skipSpace
			expect(parse("a \n   b;").ast.body).toHaveLength(2);
			// unicode whitespace running to eof
			expect(parse("a; ").ast.body).toHaveLength(1);
		});
	});

	describe("tokenizer cold paths (ported from acorn)", () => {
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

		it("should cook hex, unicode and octal string escapes", () => {
			expect(literal('var x = "\\x41\\u0042\\u{1F600}"').value).toBe(
				"AB\u{1F600}"
			);
			// a hex escape routes the whole string cold, so every following escape
			// is cooked there too, including the CRLF line continuation
			expect(literal('var x = "\\x41\\r\\b\\f\\v\\n\\t"').value).toBe(
				"A\r\b\f\u000B\n\t"
			);
			expect(literal('var x = "\\x41\\\r\nz"').value).toBe("Az");
			// an unescaped LS/PS stays valid (ES2019+) even on the cold path
			const ls = String.fromCharCode(0x2028);
			expect(literal(`var x = "\\x41${ls}b"`).value).toBe(`A${ls}b`);
			// an octal escape > 255 drops its last digit, which stays literal
			expect(literal('var x = "\\400"').value).toBe(" 0");
			expect(literal('var x = "\\101\\0"').value).toBe("A\u0000");
		});

		it("should report bad and out-of-range escapes like acorn", () => {
			expect(() => parse('var x = "\\xZZ"')).toThrow(
				/Bad character escape sequence/
			);
			expect(() => parse('var x = "\\u{110000}"')).toThrow(
				/Code point out of bounds/
			);
			expect(() => parse('"use strict"; var x = "\\101"')).toThrow(
				/Octal literal in strict mode/
			);
			expect(() => parse('"use strict"; var x = "\\8"')).toThrow(
				/Invalid escape sequence/
			);
			// a bare line terminator after a cold escape is still unterminated
			expect(() => parse('var x = "\\x41\nb"')).toThrow(
				/Unterminated string constant/
			);
		});

		it("should cook escapes and yield null for invalid template escapes", () => {
			/**
			 * @param {string} code source with a template literal
			 * @returns {string | null | undefined} the first quasi's cooked value
			 */
			const cooked = (code) => {
				const statement =
					/** @type {import("estree").ExpressionStatement} */
					(parse(code).ast.body[0]);
				return /** @type {import("estree").TemplateLiteral} */ (
					statement.expression
				).quasis[0].value.cooked;
			};
			expect(cooked("`a\\x41\\u{42}b`;")).toBe("aABb");
			// a tagged template keeps an invalid escape with a null cooked value
			const tagged =
				/** @type {import("estree").TaggedTemplateExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (
						parse("tag`bad \\8`;").ast.body[0]
					).expression
				);
			expect(tagged.quasi.quasis[0].value.cooked).toBeNull();
			// an untagged invalid template escape is rejected by the parser
			expect(() => parse("`bad \\8`;")).toThrow(
				/Bad escape sequence in untagged template literal/
			);
			// a cold template chunk (escape seen) that never closes is unterminated
			expect(() => parse("`a\\t")).toThrow(/Unterminated template/);
		});

		it("should read radix integers and bigints", () => {
			expect(literal("var x = 0xFF").value).toBe(255);
			expect(literal("var x = 0o17").value).toBe(15);
			expect(literal("var x = 0b1010").value).toBe(10);
			expect(literal("var x = 0x1Fn").value).toBe(BigInt(31));
			expect(typeof literal("var x = 0b101n").value).toBe("bigint");
		});

		it("should report radix, separator and octal number errors like acorn", () => {
			expect(() => parse("var x = 0x")).toThrow(/Expected number in radix 16/);
			expect(() => parse("var x = 0x1g")).toThrow(
				/Identifier directly after number/
			);
			expect(() => parse("var x = 0x_1")).toThrow(
				/Numeric separator is not allowed at the first of digits/
			);
			expect(() => parse("var x = 1_")).toThrow(
				/Numeric separator is not allowed at the last of digits/
			);
			expect(() => parse("var x = 1__2")).toThrow(
				/Numeric separator must be exactly one underscore/
			);
			expect(() => parse("var x = 0_1")).toThrow(
				/Numeric separator is not allowed in legacy octal/
			);
			expect(() => parse('"use strict"; var x = 0777')).toThrow(
				/Invalid number/
			);
			expect(() => parse("var x = 123nx")).toThrow(
				/Identifier directly after number/
			);
		});

		it("should read legacy octal, exponent and float forms", () => {
			expect(literal("var x = 0777").value).toBe(511);
			// an 8 or 9 digit makes a leading-zero literal decimal, not octal
			expect(literal("var x = 0778").value).toBe(778);
			expect(literal("var x = 1e3").value).toBe(1000);
			expect(literal("var x = 1E-3").value).toBe(0.001);
			expect(literal("var x = 1.5e+2").value).toBe(150);
			expect(() => parse("var x = 1e")).toThrow(/Invalid number/);
		});

		it("should read escaped and astral identifiers", () => {
			/**
			 * @param {string} code source
			 * @returns {string} the sole declarator's binding name
			 */
			const idName = (code) => {
				const declaration =
					/** @type {import("estree").VariableDeclaration} */
					(parse(code).ast.body[0]);
				return /** @type {import("estree").Identifier} */ (
					declaration.declarations[0].id
				).name;
			};
			expect(idName("var \\u0041 = 1")).toBe("A");
			expect(idName("var \\u{42} = 1")).toBe("B");
			// a raw astral identifier advances two code units per character
			const astral = String.fromCodePoint(0x1d400);
			expect(idName(`var ${astral} = 1`)).toBe(astral);
		});

		it("should report identifier escape errors like acorn", () => {
			expect(() => parse("var \\q = 1")).toThrow(
				/Expecting Unicode escape sequence/
			);
			expect(() => parse("var \\u0020 = 1")).toThrow(/Invalid Unicode escape/);
		});

		it("should read private identifiers and reject stray characters", () => {
			expect(
				parse("class C { #x = 1; m() { return this.#x; } }").ast
			).toBeDefined();
			expect(() => parse("var x = #;")).toThrow(/Unexpected character/);
			expect(() => parse("var x = §;")).toThrow(/Unexpected character/);
		});

		it("should skip unicode whitespace and comments before a token", () => {
			// NBSP, ideographic and em spaces and LS around real tokens are consumed
			expect(literal(`var x =${String.fromCharCode(0xa0)}1`).value).toBe(1);
			expect(literal(`var x =${String.fromCharCode(0x3000)}1`).value).toBe(1);
			expect(literal(`var x =${String.fromCharCode(0x2028)}1`).value).toBe(1);
			expect(
				literal(`var x =${String.fromCharCode(0x2003)}/* c */1`).value
			).toBe(1);
			// a CRLF following unicode whitespace is consumed as one line break
			expect(literal(`var x =${String.fromCharCode(0xa0)}\r\n1`).value).toBe(1);
			// unicode whitespace before a `/` that is division, not a comment
			const em = String.fromCharCode(0x2003);
			const statement =
				/** @type {import("estree").ExpressionStatement} */
				(parse(`x${em}/ y;`).ast.body[0]);
			expect(statement.expression.type).toBe("BinaryExpression");
		});
	});
});
