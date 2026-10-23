"use strict";

// cspell:ignore dgimsuy

/** @typedef {typeof import("../../../lib/javascript/syntax-parser")} ParserExports */
/** @typedef {Partial<import("../../../lib/javascript/syntax-parser").Options>} PortOptions */

const acorn = require("acorn");
const { parse, plain } = require("../../helpers/javascriptParse");
const {
	Parser,
	Position,
	TokContext,
	WebpackParser,
	nextLineBreak,
	tokTypes
} = require("../../../lib/javascript/syntax-parser");

// acorn's exports have the shape of ours, which is what the port promises
const acornPort = /** @type {ParserExports} */ (/** @type {unknown} */ (acorn));

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

		it("should re-read a `/=` the tokenizer took for division as a regexp", () => {
			// `await` and a block's `}` leave the tokenizer guessing division, but
			// an expression belongs there, so the spec reads a regexp (acorn throws)
			const sources = [
				"async function f() { await /=a/g; }",
				"x\n{} /=a/g",
				"class A { static { class B {} /=a/g; } }"
			];
			for (const source of sources) {
				expect(() => acorn.parse(source, { ecmaVersion: "latest" })).toThrow(
					/Unexpected token/
				);
				for (const options of [{}, { locations: true }]) {
					expect(JSON.stringify(parse(source, options).ast)).toContain(
						'"pattern":"=a"'
					);
				}
				expect(
					JSON.stringify(Parser.parse(source, { ecmaVersion: "latest" }))
				).toContain('"pattern":"=a"');
			}
			expect(() => parse("x = /=")).toThrow(
				/Unterminated regular expression \(1:5\)/
			);
			// a lone `/` there is re-read the same way, which acorn does too
			for (const source of sources.map((code) => code.replace("/=a/", "/a/"))) {
				for (const options of [{}, { locations: true }]) {
					expect(JSON.stringify(parse(source, options).ast)).toContain(
						'"pattern":"a"'
					);
				}
			}
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
			// input that ends right after a substitution's `}` is a SyntaxError
			// like acorn's, not a TypeError from the lazy template element
			expect(() => parse("x = `${ 1 }")).toThrow(
				/Unterminated template literal \(1:11\)/
			);
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

/**
 * @param {unknown} err what a tokenizer threw
 * @returns {unknown} its message and where it was raised, as plain data
 */
const errorOutcome = (err) => {
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
};

/**
 * Every token and comment a tokenizer reads from a source, or the error it
 * threw with where it was raised.
 * @param {typeof Parser} parser the parser class whose tokenizer to run
 * @param {string} source the program text
 * @param {PortOptions} options tokenizer options
 * @returns {unknown} the outcome as plain data
 */
const tokenized = (parser, source, options) => {
	/** @type {unknown[]} */
	const comments = [];
	/** @type {unknown[]} */
	const tokens = [];
	try {
		for (const token of parser.tokenizer(source, {
			...options,
			onComment: /** @type {EXPECTED_ANY} */ (comments)
		})) {
			tokens.push(token);
		}
		return plain({ tokens, comments });
	} catch (err) {
		return errorOutcome(err);
	}
};

/**
 * The tokens a full parse reports through `onToken`, where the parser rather
 * than the tokenizer's guess decides some contexts, or the error it threw.
 * @param {typeof Parser} parser the parser class to run
 * @param {string} source the program text
 * @param {PortOptions} options parse options
 * @returns {unknown} the outcome as plain data
 */
const parsedTokens = (parser, source, options) => {
	/** @type {unknown[]} */
	const tokens = [];
	try {
		parser.parse(source, {
			...options,
			onToken: /** @type {EXPECTED_ANY} */ (tokens)
		});
		return plain(tokens);
	} catch (err) {
		return errorOutcome(err);
	}
};

/**
 * @param {unknown[]} comments collected comments
 * @returns {unknown[]} the fields acorn's and the lazy comments share
 */
const commentFields = (comments) =>
	comments.map((comment) => {
		const { type, value, start, end } =
			/** @type {{ type: string, value: string, start: number, end: number }} */ (
				comment
			);
		return { type, value, start, end };
	});

/**
 * The tokens and comments webpack's parser reads on its own paths: comments
 * collected lazily as a build does, or not collected at all, so the owned
 * comment skipping runs instead of acorn's.
 * @param {string} source the program text
 * @param {PortOptions & { lazyNodes?: boolean }} options tokenizer options
 * @param {boolean} collect whether to collect comments lazily
 * @returns {unknown} the outcome as plain data
 */
const tokenizedByWebpack = (source, options, collect) => {
	/** @type {unknown[]} */
	const comments = [];
	/** @type {unknown[]} */
	const tokens = [];
	try {
		for (const token of WebpackParser.tokenizer(
			source,
			/** @type {PortOptions} */ ({
				...options,
				lazyComments: collect ? comments : undefined
			})
		)) {
			tokens.push(token);
		}
		return plain({ tokens, comments: collect ? commentFields(comments) : [] });
	} catch (err) {
		return errorOutcome(err);
	}
};

/**
 * @param {string} source the program text
 * @param {PortOptions=} options tokenizer options
 * @returns {string[]} the label of each token before eof
 */
const labels = (source, options = { ecmaVersion: "latest" }) =>
	Array.from(Parser.tokenizer(source, options), (token) => token.type.label);

/**
 * Both tokenizers measured against acorn: webpack's parser overrides the hot
 * tokenizer methods with inlined copies, taken whenever locations are off.
 * @type {[string, typeof Parser][]}
 */
const PARSERS = [
	["Parser", Parser],
	["WebpackParser", /** @type {typeof Parser} */ (/** @type {unknown} */ (WebpackParser))]
];

/** @type {[string, PortOptions][]} */
const TOKENIZER_OPTION_SETS = [
	["es3", { ecmaVersion: 3 }],
	["es5", { ecmaVersion: 5 }],
	["es2015 with locations", { ecmaVersion: 6, locations: true }],
	["es2016", { ecmaVersion: 7 }],
	["es2018", { ecmaVersion: 9 }],
	["es2019 with ranges", { ecmaVersion: 10, ranges: true }],
	["es2020", { ecmaVersion: 11 }],
	["es2021", { ecmaVersion: 12 }],
	["es2022", { ecmaVersion: 13 }],
	[
		"latest with locations, ranges and a source file",
		{
			ecmaVersion: "latest",
			locations: true,
			ranges: true,
			sourceFile: "input.js"
		}
	],
	["latest module", { ecmaVersion: "latest", sourceType: "module" }],
	["latest without hashbang", { ecmaVersion: "latest", allowHashBang: false }]
];

// template sources spell `${` as text on purpose
/* eslint-disable no-template-curly-in-string */
/**
 * Sources by what they exercise, each tokenized under every option set: the
 * option sets cross the ecmaVersion gates (`**`, `?.`, `??=`, bigint,
 * separators, private names, template escapes, regexp flags) and the
 * locations/ranges bookkeeping.
 * @type {Record<string, string[]>}
 */
const TOKENIZER_SOURCES = {
	punctuators: [
		"a.b; a?.b; a?.5:1; a ?? b; a ??= b; a ||= b; a &&= b; a || b && c;",
		"a | b & c ^ d; a |= 1; a &= 1; a ^= 1; ~a; !a; a ? b : c;",
		"a ** b; a **= b; a * b; a *= b; a % b; a %= b;",
		"a + b - c; a += 1; a -= 1; a++; --a; +a; -a;",
		"a < b; a <= b; a > b; a >= b; a << b; a >> b; a >>> b;",
		"a <<= 1; a >>= 1; a >>>= 1;",
		"a == b; a === b; a != b; a !== b; a = b; (a) => b;",
		"f(...a); [a, b]; ({ a: 1 }); x / y; x /= y; x = /re/g;",
		"@",
		"a \u2E2E b",
		"\u{1F600}",
		"\u000E",
		"a..b; a...b"
	],
	numbers: [
		"0x1F 0X1f 0o17 0O17 0b101 0B1 0777 0778 089 .5 1. 1.5e10 1E+5 2e-3 .5e3",
		"00 0.0 09.5 5..toString",
		"1_000 0x1_F 1_0.0_1e1_0 0b1_0 0o1_7",
		"0x1Fn 10n 0b1n 0o7n 0n",
		"0x",
		"0x_1",
		"1__0",
		"1_",
		"0_1",
		"08_1",
		"1.5n",
		"0777n",
		"1e",
		"1e+",
		"3in",
		"0xg",
		"0b2",
		"0o8",
		"10nx",
		'"use strict"; 0777',
		'"use strict"; 08',
		'"use strict"; 0',
		"1234567890123456 123456789012345 9007199254740993",
		"0.123456789012345 1.5",
		"1."
	],
	strings: [
		"'a' \"b\" 'it\\'s' \"q\\\"\"",
		"'\\x41\\u0041\\u{41}\\u{1F600}'",
		"'\\n\\r\\t\\b\\v\\f\\0\\'\\\\\\a'",
		"'\\101\\08\\9\\400\\1\\12\\377'",
		"'a\\\nb' 'a\\\r\nb' 'a\\\rb' 'a\\\u2028b'",
		"'a\u2028b\u2029c'\n'd'",
		"'a\nb'",
		"'a\rb'",
		"'abc",
		"'abc\\",
		"'\\u{110000}'",
		"'\\u{41'",
		"'\\xZ'",
		"'\\uZZZZ'",
		"'\\u{}'",
		'"use strict"; "\\01"',
		'"use strict"; "\\0"',
		'"use strict"; "\\08"',
		'"use strict"; "\\9"'
	],
	templates: [
		"`a${b}c${d}e`",
		"`\\n\\x41\\u{42}\\u0043\\0`",
		"`a\r\nb\rc\nd\u2028e\u2029f`\nx",
		"`a\\\r\nb\\\nc`\nx",
		"tag`\\8`",
		"`\\01`",
		"`\\0`",
		"`\\00`",
		"`\\08`",
		"`\\u{110000}`",
		"`\\xg${a}\\uZ`",
		"`\\xg\r\n\n\r\u2028\\``\nx",
		"`\\xg",
		"`\\xg$a`",
		"`abc",
		"`abc${",
		"`a${`b${c}`}d`",
		"`${ {a: 1} }` / 2",
		"`${a}` / 2; `${/re/}`",
		"`",
		"`${a}"
	],
	regexps: [
		"/a/g; /[/]/; /\\//; /[\\]/]/; /a/i",
		"/a/dgimsuy",
		"/a/v",
		"/a/uv",
		"/a/d",
		"/a/s",
		"/a/y",
		"/a/gg",
		"/a/x",
		"/a/\\u0067",
		"/a",
		"/a\n/",
		"/[a/",
		"/(?<n>x)\\k<n>/",
		"/\\k<n>/",
		"/(/",
		"/(?i:a)/",
		"/(?<a>x)|(?<a>y)/",
		// syntax V8 builds whatever the edition, which acorn gates on ES2018
		"/(?<=a)b/; /(?<n>x)/; /\\p{L}/u; /(?<\\u{61}>.)/"
	],
	"comments and whitespace": [
		"// line\n/* block */ /*\n multi\r\n line\u2028*/ a // end",
		"<!-- html\na --> b\n--> close\n-->",
		"--> at the start",
		"a\n--> after a line break",
		"a /* c */ --> after a comment",
		"a /*\n*/ --> after a multi-line comment",
		"a <!-- b",
		"a <! b; a <!- b",
		"/* unterminated",
		"/* a */ / b",
		"\t\v\f \u00A0\uFEFF\u1680\u2000\u200A\u202F\u205F\u3000a\u2028b\u2029c\r\nd\re",
		"a\u180E",
		"#!/usr/bin/env node\na",
		"#!",
		"a\n#!b"
	],
	identifiers: [
		"\u00E9 \u2118 \u309B abc$_ $ _ a1 a\u0300",
		"\\u0061bc a\\u0062 \\u{61} \\u{1D400} a\\u{1D7CE}",
		"\u{1D400} a\u{1D400} a\u{1D7CE}",
		"a\u{1D400}",
		"\\u0030",
		"a\\u0020",
		"\\x41",
		"a\\",
		"\\u{110000}",
		"\\uZZZZ",
		"\\u{1F600}",
		"\\u0069f (a);",
		"a.\\u0069f",
		"\\u{69}f",
		"\uD835",
		"\uD835a",
		"a\uDC00",
		"\u{1D400}",
		"#x #\\u0061 #\u{1D400}",
		"#1",
		"# x"
	],
	keywords: [
		"if else for while do var let const class extends super import export",
		"new this null true false typeof instanceof in of yield async await",
		"function return break continue switch case default throw try catch",
		"finally debugger with void delete enum implements static",
		"a.if / 2; a.in / 2; a.of / 2; of / 2"
	],
	// where `/` is a regexp or a division depends on the tokenizer's context
	contexts: [
		"if (a) /re/.test(b); while (a) /x/; (a) / b; f() / 2; a[0] / 2",
		"x = {} / 1; {} /re/; x = { a: /re/ }; a: /re/; a ? {} : /re/",
		"function f() { return /re/; return\n/re/; return {} / 2; return\n{} /re/ }",
		"x = function () {} / 2; function f() {} /re/",
		"x = class {} / 2; class A {} /re/",
		"(function () {} / 2); if (a) function f() {} /re/",
		"a: function f() {} /re/; { function g() {} /re/ }",
		"function f() { return function () {} / 2; return\nfunction g() {} /re/ }",
		"if (a) {} else function f() {} /re/",
		"for (;;) function f() {} / 2",
		"x = function* () {} / 2; function* g() {} /re/",
		"if (a) b; else /re/; a++ / 2; ++/re/.lastIndex",
		"for (x of /re/g); yield / 2; typeof /re/; a => /re/",
		"x => {} /re/; ; {} /re/; if (a) {} /re/; else {} /re/",
		"var {} / 2; const {} / 2; a\n{} / 2; { {} /re/ }",
		"x = `${ {} }`; `${ {} /2 }`; a: {} /re/",
		"x = { a: {} / 2 }; x = { a: function () {} / 2 }",
		"switch (a) { case /re/: }",
		"x = y ? function () {} : /re/",
		// a keyword property name pushes a function context its colon pops
		"x = { function: /re/, class: 1 } / 2",
		// `yield` in a generator is an operator, so a regexp follows it
		"function* g() { yield /re/g; yield\n/re/; yield }",
		"x = function* () { yield /re/ }; function* g() { function f() { yield / 2 } yield /re/ }"
	]
};
/* eslint-enable no-template-curly-in-string */

describe("Parser.tokenizer", () => {
	describe("tokenizes like acorn", () => {
		for (const [group, sources] of Object.entries(TOKENIZER_SOURCES)) {
			it(`for ${group} under every option set`, () => {
				const differences = [];
				for (const source of sources) {
					for (const [name, options] of TOKENIZER_OPTION_SETS) {
						const theirs = tokenized(acornPort.Parser, source, options);
						for (const [parserName, parser] of PARSERS) {
							const ours = tokenized(parser, source, options);
							if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
								differences.push({
									parser: parserName,
									source,
									options: name,
									ours,
									theirs
								});
							}
						}
						// lazy nodes drop ranges and locations, so only the sets
						// without them can compare
						if (options.locations || options.ranges) continue;
						const expected =
							/** @type {{ tokens?: unknown[], comments: unknown[] }} */ (
								theirs
							);
						for (const [variant, lazyNodes, collect] of [
							["lazy, comments collected", true, true],
							["lazy, comments skipped", true, false],
							["comments skipped", false, false]
						]) {
							const ours = tokenizedByWebpack(
								source,
								{ ...options, lazyNodes: Boolean(lazyNodes) },
								Boolean(collect)
							);
							const wanted = expected.tokens
								? {
										tokens: expected.tokens,
										comments: collect ? commentFields(expected.comments) : []
									}
								: expected;
							if (JSON.stringify(ours) !== JSON.stringify(wanted)) {
								differences.push({
									parser: `WebpackParser, ${variant}`,
									source,
									options: name,
									ours,
									theirs: wanted
								});
							}
						}
					}
				}
				expect(differences).toEqual([]);
			});
		}
	});

	describe("parser-decided contexts", () => {
		it("should report the same tokens as acorn when the parser overrides a context", () => {
			const sources = [
				// `async function` reads as a statement until the parser says otherwise
				"x = async function () {} / 2; async function f() {} /re/",
				// a brace after a conditional's colon is an object, not a block
				"x = a ? b : {} / 2; x = a ? b : function () {} / 2",
				"function* g() { yield /re/g; yield\n{} }",
				"x = { a: {} / 2 }; label: {} /re/"
			];
			const differences = [];
			for (const source of sources) {
				for (const options of /** @type {PortOptions[]} */ ([
					{ ecmaVersion: "latest", locations: true, ranges: true },
					{ ecmaVersion: 8 }
				])) {
					const theirs = parsedTokens(acornPort.Parser, source, options);
					for (const [parserName, parser] of PARSERS) {
						const ours = parsedTokens(parser, source, options);
						if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
							differences.push({ parser: parserName, source, options, ours, theirs });
						}
					}
				}
			}
			expect(differences).toEqual([]);
			// the override is what turns the `/` after `{}` into a division
			const tokens = /** @type {{ type: { label: string } }[]} */ (
				parsedTokens(Parser, "x = a ? b : {} / 2", { ecmaVersion: "latest" })
			);
			expect(tokens.map((token) => token.type.label)).toEqual([
				"name",
				"=",
				"name",
				"?",
				"name",
				":",
				"{",
				"}",
				"/",
				"num",
				"eof"
			]);
		});

		it("should read a regexp after `yield` in a generator method", () => {
			// a deliberate divergence, documented on `inGeneratorContext`: acorn
			// looks for a generator `function` context, which a method's `*` never
			// pushes, so it reads a division here and rejects the program
			const source = "class A { *g() { yield /re/g; } }";
			const tokens = /** @type {{ type: { label: string } }[]} */ (
				parsedTokens(Parser, source, { ecmaVersion: "latest" })
			);
			expect(tokens.map((token) => token.type.label)).toContain("regexp");
			expect(
				parsedTokens(acornPort.Parser, source, { ecmaVersion: "latest" })
			).toMatchObject({ error: "Unexpected token (1:23)" });
		});
	});

	describe("token stream", () => {
		it("should stop iterating at eof and keep returning eof", () => {
			const tokenizer = Parser.tokenizer("a b", { ecmaVersion: "latest" });
			expect(Array.from(tokenizer, (token) => token.value)).toEqual(["a", "b"]);
			expect(tokenizer.getToken().type).toBe(tokTypes.eof);
			expect(tokenizer.getToken().type).toBe(tokTypes.eof);
		});

		it("should skip comments when nothing collects them", () => {
			const source = "a // line\nb /* block */ c";
			expect(labels(source)).toEqual(["name", "name", "name"]);
			expect(
				plain([...Parser.tokenizer(source, { ecmaVersion: "latest" })])
			).toEqual(
				plain([
					...acornPort.Parser.tokenizer(source, { ecmaVersion: "latest" })
				])
			);
		});

		it("should hand comments and tokens to callbacks like acorn", () => {
			const source = "/* a */ x // b\n= 1;";
			/**
			 * @param {typeof Parser} parser the parser class to run
			 * @returns {unknown[]} each callback's arguments, in call order
			 */
			const calls = (parser) => {
				/** @type {unknown[]} */
				const seen = [];
				parser.parse(source, {
					ecmaVersion: "latest",
					locations: true,
					onComment: (block, text, start, end, startLoc, endLoc) => {
						seen.push(["comment", block, text, start, end, startLoc, endLoc]);
					},
					onToken: (token) => {
						seen.push(["token", token]);
					}
				});
				return /** @type {unknown[]} */ (plain(seen));
			};
			expect(calls(Parser)).toEqual(calls(acornPort.Parser));
			expect(calls(Parser).slice(0, 2)).toEqual([
				[
					"comment",
					true,
					" a ",
					0,
					7,
					{ line: 1, column: 0 },
					{ line: 1, column: 7 }
				],
				[
					"token",
					expect.objectContaining({ type: { label: "name" }, value: "x" })
				]
			]);
		});

		it("should show onTokenRead the parser at each token", () => {
			for (const [, parser] of PARSERS) {
				/** @type {[string, unknown][]} */
				const seen = [];
				parser.parse("x = 1;", {
					ecmaVersion: "latest",
					onTokenRead: (instance) => {
						seen.push([instance.type.label, instance.value]);
					}
				});
				expect(seen).toEqual([
					["name", "x"],
					["=", "="],
					["num", 1],
					[";", undefined],
					["eof", undefined]
				]);
			}
		});

		it("should report an error's line and column without locations", () => {
			// CRLF counts as one line break and LS as another
			const tokenizer = Parser.tokenizer("a\r\n\u2028  @", {
				ecmaVersion: "latest",
				sourceFile: "input.js"
			});
			expect(() => [...tokenizer]).toThrow(
				expect.objectContaining({
					message: "Unexpected character '@' (3:2) in input.js",
					pos: 6,
					loc: expect.objectContaining({ line: 3, column: 2 })
				})
			);
		});
	});

	describe("plugin hooks", () => {
		/**
		 * A plugin's subclass whose tokenizer starts inside a context of its own,
		 * as acorn-jsx's tag contexts do.
		 * @param {typeof Parser} parser the parser class to extend
		 * @param {typeof TokContext} Context that parser's context class
		 * @param {boolean} preserveSpace whether the context keeps whitespace
		 * @param {((parser: EXPECTED_ANY) => void)=} override its own reader
		 * @returns {typeof Parser} the subclass
		 */
		const inContext = (parser, Context, preserveSpace, override) =>
			class extends parser {
				initialContext() {
					return [
						...super.initialContext(),
						new Context("plugin", false, preserveSpace, override)
					];
				}
			};

		it("should leave a plugin's own contexts to acorn's nextToken", () => {
			/** @type {[string, boolean, ((parser: EXPECTED_ANY) => void) | undefined][]} */
			const contexts = [
				// whitespace kept: no skip runs before readToken
				["a=b.c", true, undefined],
				// a reader of its own, after the usual whitespace skip
				["a  b", false, (parser) => parser.readWord()]
			];
			for (const [source, preserveSpace, override] of contexts) {
				const theirs = tokenized(
					inContext(
						acornPort.Parser,
						acornPort.TokContext,
						preserveSpace,
						override
					),
					source,
					{ ecmaVersion: "latest" }
				);
				expect(theirs).toMatchObject({ tokens: expect.any(Array) });
				for (const [, parser] of PARSERS) {
					expect(
						tokenized(
							inContext(parser, TokContext, preserveSpace, override),
							source,
							{ ecmaVersion: "latest" }
						)
					).toEqual(theirs);
				}
			}
		});

		it("should finish every token through a plugin's finishToken when lazy", () => {
			const source = "f(a, [b]); { c: d } x = y.z;";
			/** @type {string[]} */
			const finished = [];
			class Recording extends WebpackParser {
				/**
				 * @param {import("../../../lib/javascript/syntax-parser").TokenType} type the token's kind
				 * @param {EXPECTED_ANY=} value what it carries
				 * @returns {void}
				 */
				finishToken(type, value) {
					finished.push(type.label);
					return super.finishToken(type, value);
				}
			}
			const ours = tokenized(
				/** @type {typeof Parser} */ (/** @type {unknown} */ (Recording)),
				source,
				/** @type {PortOptions} */ ({ ecmaVersion: "latest", lazyNodes: true })
			);
			expect(ours).toEqual(
				tokenized(acornPort.Parser, source, { ecmaVersion: "latest" })
			);
			// the inlined punctuator finish defers to the override
			expect(finished).toEqual([...labels(source), "eof"]);
		});
	});

	describe("position helpers", () => {
		it("should find the end of the next line break, CRLF as one", () => {
			expect(nextLineBreak("a\r\nb", 0)).toBe(3);
			expect(nextLineBreak("a\rb", 0)).toBe(2);
			expect(nextLineBreak("a\u2029b", 0)).toBe(2);
			expect(nextLineBreak("ab", 0)).toBe(-1);
			// a CR at the limit is a whole break, whatever follows it
			expect(nextLineBreak("a\r\nb", 0, 2)).toBe(2);
		});

		it("should shift a position along its line like acorn", () => {
			expect(new Position(2, 3).offset(4)).toEqual(
				expect.objectContaining({ line: 2, column: 7 })
			);
			expect(plain(new Position(2, 3).offset(4))).toEqual(
				plain(new acornPort.Position(2, 3).offset(4))
			);
		});
	});
});
