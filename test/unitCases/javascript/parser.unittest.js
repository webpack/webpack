"use strict";

// cspell:ignore ypeof averyvery ahri aafom Unsyntactic
// cspell:ignore Grek Kawi Mundari Garay Todhri Keycap aeiou gimsuyd dgimsvy
/* eslint-disable no-template-curly-in-string */

const fs = require("fs");
const os = require("os");
const path = require("path");
const acorn = require("acorn");
const JavascriptParser = require("../../../lib/javascript/JavascriptParser");
const { parse: webpackParse } = require("../../../lib/javascript/syntax").parser;
const { Parser } = require("../../../lib/javascript/syntax-parser");

/** @typedef {import("../../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */
/** @typedef {import("../../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */
/** @typedef {{ ast: import("estree").Program, comments: CollectedComment[] }} ParseResult */
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
	it("keeps deferred destructuring errors in lazy nodes", () => {
		expect(() => parse("({ a = 0, b: c });")).toThrow(
			/Shorthand property assignments are valid only in destructuring patterns/
		);
		expect(() =>
			parse("({ __proto__: a, __proto__: b, c: d });")
		).toThrow(/Redefinition of __proto__ property/);
		expect(() =>
			parse("({ __proto__: a, __proto__: b, c: d = 0 } = source);")
		).not.toThrow();
		expect(() => parse("([...items,].length = 0);")).not.toThrow();
	});

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
			// comments carry no `loc` — locations derive from offsets
			expect(comments[1].loc).toBeUndefined();
		});

		it("should memoize and accept explicit value writes", () => {
			const { comments } = parse("// abc\n");
			expect(comments[0].value).toBe(" abc");
			// memoized second read
			expect(comments[0].value).toBe(" abc");
			comments[0].value = "override";
			expect(comments[0].value).toBe("override");
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

		it("should map positions across CRLF, CR, LS and PS line breaks", () => {
			const code = "// a\r\n// b\r// c\u2028// d\u2029// e\n";
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
			expect(literal("var x = 0").value).toBe(0);
			expect(literal("var x = 42").value).toBe(42);
			expect(literal("var x = 1.5").value).toBe(1.5);
			expect(literal("var x = 0.5").value).toBe(0.5);
			expect(literal("var x = 100.").value).toBe(100);
			expect(literal("var x = 1.").value).toBe(1);
			expect(literal("var x = .5").value).toBe(0.5);
		});

		it("should read radix, exponent, separator and bigint literals on the cold path", () => {
			expect(literal("var x = 0x1f").value).toBe(31);
			expect(literal("var x = 0o17").value).toBe(15);
			expect(literal("var x = 0b101").value).toBe(5);
			expect(literal("var x = 1e3").value).toBe(1000);
			expect(literal("var x = 1_000").value).toBe(1000);
			expect(literal("var x = 1234567890123456").value).toBe(1234567890123456);
			expect(typeof literal("var x = 123n").value).toBe("bigint");
		});

		it("should reject an identifier directly after a number", () => {
			expect(() => parse("var x = 0abc")).toThrow(
				/Identifier directly after number/
			);
			expect(() => parse("var x = 1.5abc")).toThrow(
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
			expect(literal('var x = "abc"').value).toBe("abc");
			expect(literal("var x = 'abc'").value).toBe("abc");
			expect(literal('var x = ""').value).toBe("");
			expect(literal("var x = 'it\"s'").value).toBe('it"s');
			const lit = literal('var x = "abc"');
			expect(lit.raw).toBe('"abc"');
			expect(lit.range).toEqual([8, 13]);
		});

		it("should read a string ending at the end of input", () => {
			expect(literal("var x = 'tail'").value).toBe("tail");
		});

		it("should allow unescaped LS/PS in strings (ES2019+) but delegate them below ES2019", () => {
			expect(literal("var x = '\u2028'").value).toBe("\u2028");
			expect(literal("var x = '\u2029'").value).toBe("\u2029");
			expect(() => parse("var x = '\u2028'", { ecmaVersion: 2018 })).toThrow(
				/Unterminated string constant/
			);
			// an escape in the same string routes it through the cold reader, which
			// carries the version rule of its own
			expect(literal('var x = "a\\tb\u2028c"').value).toBe("a\tb\u2028c");
			expect(() =>
				parse('var x = "a\\tb\u2028c"', { ecmaVersion: 2018 })
			).toThrow(/Unterminated string constant/);
		});

		it("should cook the common single-char escapes", () => {
			expect(literal('var x = "a\\nb"').value).toBe("a\nb");
			expect(literal('var x = "a\\tb"').value).toBe("a\tb");
			expect(literal('var x = "a\\rb"').value).toBe("a\rb");
			expect(literal('var x = "a\\bb"').value).toBe("a\bb");
			expect(literal('var x = "a\\fb"').value).toBe("a\fb");
			expect(literal('var x = "a\\vb"').value).toBe("a\u000Bb");
			expect(literal('var x = "a\\\\b"').value).toBe("a\\b");
			expect(literal("var x = 'it\\'s'").value).toBe("it's");
			expect(literal('var x = "q\\"q"').value).toBe('q"q');
			// unknown escapes are the escaped char verbatim
			expect(literal('var x = "a\\qb"').value).toBe("aqb");
			expect(literal('var x = "a\\éb"').value).toBe("aéb");
		});

		it("should cook line continuations", () => {
			expect(literal('var x = "a\\\nb"').value).toBe("ab");
			expect(literal('var x = "a\\\r\nb"').value).toBe("ab");
			expect(literal('var x = "a\\\rb"').value).toBe("ab");
			expect(
				literal(`var x = "a\\${String.fromCharCode(0x2028)}b"`).value
			).toBe("ab");
			expect(
				literal(`var x = "a\\${String.fromCharCode(0x2029)}b"`).value
			).toBe("ab");
		});

		it("should route every escape through the cold reader", () => {
			expect(literal('var x = "a\\x41b"').value).toBe("aAb");
			expect(literal('var x = "a\\u0041b"').value).toBe("aAb");
			expect(literal('var x = "a\\u{1F600}b"').value).toBe("a\u{1F600}b");
			expect(literal('var x = "a\\101b"').value).toBe("aAb");
			expect(literal('var x = "a\\0b"').value).toBe("a b");
			// octal in strict mode still throws through the cold reader
			expect(() => parse('"use strict";\nvar x = "\\101";')).toThrow(
				/Octal literal in strict mode/
			);
		});

		it("should cook a string mixing owned and delegated escapes", () => {
			expect(literal('var x = "a\\n\\x41\\t\\\\z"').value).toBe("a\nA\t\\z");
		});

		it("should report a lone trailing backslash as unterminated", () => {
			expect(() => parse('var x = "abc\\')).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report a string ending after a cooked escape as unterminated", () => {
			// the escape cooks and then the cold reader's own loop meets EOF, which
			// is a different raise from the trailing backslash above
			expect(() => parse('var x = "a\\tb')).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report strings broken by a line terminator", () => {
			expect(() => parse('var x = "a\nb"')).toThrow(
				/Unterminated string constant/
			);
			expect(() => parse('var x = "a\rb"')).toThrow(
				/Unterminated string constant/
			);
		});

		it("should report unterminated strings", () => {
			expect(() => parse('var x = "nope')).toThrow(
				/Unterminated string constant/
			);
			expect(() => parse("var x = '")).toThrow(/Unterminated string constant/);
		});

		it("should read strings identically when acorn tracks locations", () => {
			expect(
				literal('var x = "abc"', { ranges: false, locations: true }).value
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
			const asi = asiParserFor("a\nb", [2, 3], [0, 1]);
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
			const asi = asiParserFor("a\nb", [2, 3]);
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
				"a\nb",
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
			expect(parse("x").ast.body).toHaveLength(1);
			expect(parse("a\nb").ast.body).toHaveLength(2);
			const { ast } = parse("var x = 1.5\nvar y = 0", { ranges: false });
			expect(ast.body).toHaveLength(2);
		});

		it("should tokenize non-ASCII identifiers and unicode whitespace", () => {
			const { ast } = parse("var π = 1;\u00A0var café = 2;");
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
			expect(() => parse("function* g() { var yield; }")).toThrow(
				/Cannot use 'yield' as identifier inside a generator/
			);
			expect(() => parse("async function f() { var await; }")).toThrow(
				/Cannot use 'await' as identifier inside an async function/
			);
			expect(() =>
				parse("class C { x = arguments; }", { sourceType: "module" })
			).toThrow(/Cannot use 'arguments' in class field initializer/);
			expect(() =>
				parse("class C { static { arguments; } }", { sourceType: "module" })
			).toThrow(/class static initialization block/);
			expect(() => parse("var enum;", { sourceType: "module" })).toThrow(
				/The keyword 'enum' is reserved/
			);
			expect(() => parse("'use strict'; var eval;")).toThrow(
				/Binding eval in strict mode/
			);
		});

		it("should allow keywords as property names", () => {
			expect(
				parse("obj.class; obj.enum; ({ if: 1, default: 2 });").ast
			).toBeDefined();
		});

		it("should reject escape sequences in keywords like acorn", () => {
			// the owned `next` keyword-escape guard fires when a keyword token
			// carries a `\uXXXX` escape
			expect(() => parse("\\u0069f (x) {}")).toThrow(
				/Escape sequence in keyword if/
			);
			expect(() => parse("\\u0074ypeof x;")).toThrow(
				/Escape sequence in keyword typeof/
			);
			// `liberal` idents (keyword as property name) pass `ignore`, so an
			// escaped keyword is allowed there
			expect(parse("obj.\\u0069f;").ast).toBeDefined();
		});

		it("should allow await as a sloppy-mode identifier", () => {
			const { ast } = parse("var await = 1; await;");
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
			expect(() => parse("let x; let x;")).toThrow(
				/Identifier 'x' has already been declared/
			);
			expect(() => parse("{ let a; let a; }")).toThrow(/already been declared/);
			expect(parse("var x; var x;").ast).toBeDefined();
			expect(() => parse("export { x };", { sourceType: "module" })).toThrow(
				/Export 'x' is not defined/
			);
			expect(
				parse("export { x }; var x;", { sourceType: "module" }).ast
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
			expect(names("foo + foo + f + averyveryLongIdentifier;")).toEqual([
				"foo",
				"foo",
				"f",
				"averyveryLongIdentifier"
			]);
		});

		it("should read identifiers written with a unicode escape", () => {
			// a `\\` classifies with the non-ASCII chars, so `nextToken` reaches the
			// escape-aware cold reader through `readToken` rather than directly
			expect(names("var \\u0061bc = a\\u0062c + \\u{61}x;")).toEqual([
				"abc",
				"abc",
				"ax"
			]);
			// and the same word read plainly is the same name
			expect(names("var abc = \\u0061bc;")).toEqual(["abc", "abc"]);
		});

		it("should reclassify a cached word for a second keyword set", () => {
			// `abstract` is an ordinary name under a recent ecmaVersion and reserved
			// under ES3, so each parse retypes the slot the one before it typed
			const code = "var abstract = 1;";
			expect(names(code)).toEqual(["abstract"]);
			expect(() => parse(code, { ecmaVersion: 3, allowReserved: false })).toThrow(
				/'abstract' is reserved/
			);
			expect(names(code)).toEqual(["abstract"]);
		});

		it("should survive hash collisions by content check", () => {
			// `aaaa`/`ahri` and `aaaa`/`aafom` share a cache slot (same djb2&mask),
			// exercising the same-length and length-mismatch collision branches
			expect(names("aaaa + ahri + aaaa + aafom + aaaa;")).toEqual([
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
				"a < b; a << b; a <<= b; a === b; a === c; a >>>= b; x &&= y;"
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

	describe("expression atoms", () => {
		it("should parse keyword literals and this on the fast path", () => {
			const { ast } = parse("this; true; false; null; 1.5;");
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
				parse("const f = async function() { return 1; };").ast
			).toBeDefined();
			expect(
				parse("const g = async x => x; const h = x => x;").ast
			).toBeDefined();
			// ASI keeps `async` a plain identifier, so the arrow is unexpected
			expect(() => parse("async\n() => {};")).toThrow(/Unexpected token/);
		});
	});

	describe("statements", () => {
		it("should parse declarations, blocks and expression statements", () => {
			const { ast } = parse(
				"var a = 1, b; { let c = 2; } d = 3; for (var i = 0; i < 3; i++) {}"
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
				"if (a) b(); else if (c) { d(); } function f(){ if (x) return y; return; }"
			);
			const ifStatement = /** @type {import("estree").IfStatement} */ (
				ast.body[0]
			);
			expect(ifStatement.type).toBe("IfStatement");
			expect(
				/** @type {import("estree").IfStatement} */ (ifStatement.alternate).type
			).toBe("IfStatement");
			// the script-mode helper allows top-level return; module mode doesn't
			expect(() => parse("return 1;", { sourceType: "module" })).toThrow(
				/'return' outside of function/
			);
		});

		it("should keep acorn's declaration checks", () => {
			expect(() => parse("const f;")).toThrow(/Unexpected token/);
			expect(() => parse("let {a};")).toThrow(
				/Complex binding patterns require an initialization value/
			);
			expect(
				parse("function f(){ 'use strict'; return 1; }").ast
			).toBeDefined();
		});

		it("should dispatch let declarations and let-as-identifier like acorn", () => {
			const { ast } = parse("let a = 1; let = 2; let.x; let(1);");
			expect(ast.body.map((s) => s.type)).toEqual([
				"VariableDeclaration",
				"ExpressionStatement",
				"ExpressionStatement",
				"ExpressionStatement"
			]);
			expect(
				/** @type {import("estree").VariableDeclaration} */ (ast.body[0]).kind
			).toBe("let");
			expect(() => parse("if (a) let b = 1;")).toThrow(/Unexpected token/);
			// `let [` is the one head where isLet stays true in statement position
			expect(() => parse("if (a) let [b] = 1;")).toThrow(/Unexpected token/);
			expect(() => parse("if (a) const b = 1;")).toThrow(/Unexpected token/);
		});

		it("should parse labeled statements through acorn's tail", () => {
			const { ast } = parse("outer: for (;;) { break outer; } let: x();");
			expect(ast.body.map((s) => s.type)).toEqual([
				"LabeledStatement",
				"LabeledStatement"
			]);
			const labeled = /** @type {import("estree").LabeledStatement} */ (
				ast.body[0]
			);
			expect(labeled.label.name).toBe("outer");
			expect(labeled.range).toEqual([0, 32]);
			expect(() => parse("break outer;")).toThrow(/Unsyntactic break/);
		});

		it("should delegate async, using and await statement heads to acorn", () => {
			const { ast } = parse(
				"async function f() { await g(); } async () => 1; using?.x;"
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"FunctionDeclaration",
				"ExpressionStatement",
				"ExpressionStatement"
			]);
			const { ast: moduleAst } = parse("await x;", { sourceType: "module" });
			expect(moduleAst.body[0].type).toBe("ExpressionStatement");
		});

		it("should parse if and return through acorn without ranges", () => {
			const { ast } = parse(
				"function f() { if (a) return 1; return 2; } if (b) c();",
				{ ranges: false }
			);
			expect(ast.body.map((s) => s.type)).toEqual([
				"FunctionDeclaration",
				"IfStatement"
			]);
		});

		it("should delegate rare statement heads to acorn", () => {
			const { ast } = parse(
				"do ; while (a); switch (b) { default: } try { throw 1; } catch { } with (c) d(); debugger; ;",
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
			const code = "if (a) { b(); } var x = 1; function f() { return x; }";
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
			const { ast } = parse("a ? b : c; new A; new B(1); [1, , 2];");
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
						parse("`a${x}b`;").ast.body[0]
					).expression
				);
			expect(template.quasis.map((q) => q.value.raw)).toEqual(["a", "b"]);
			expect(template.quasis[1].tail).toBe(true);
		});

		it("should keep acorn's new.target and template escape checks", () => {
			expect(parse("function f(){ return new.target; }").ast).toBeDefined();
			expect(() => parse("new.target;")).toThrow(
				/'new\.target' can only be used in functions/
			);
			expect(() => parse("`bad \\unicode`;")).toThrow(
				/Bad escape sequence in untagged template literal/
			);
			const tagged =
				/** @type {import("estree").TaggedTemplateExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (
						parse("tag`ok \\unicode`;").ast.body[0]
					).expression
				);
			expect(tagged.quasi.quasis[0].value.cooked).toBeNull();
		});
	});

	describe("unary and update expressions", () => {
		it("should parse prefix and postfix operators on the fast path", () => {
			const { ast } = parse("!x; y++; --z; typeof w; a ** -b;");
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
			expect(() => parse('"use strict"; delete x;')).toThrow(
				/Deleting local variable in strict mode/
			);
			expect(() => parse("class C { #p; m(){ delete this.#p; } }")).toThrow(
				/Private fields can not be deleted/
			);
			expect(() => parse("-a ** 2;")).toThrow(/Unexpected token/);
			expect(() => parse("1++;")).toThrow(/Assigning to rvalue/);
		});
	});

	describe("assignment expressions", () => {
		it("should parse destructuring, chained and compound assignments", () => {
			expect(
				parse("({a, b = 1} = obj); [x = 2, ...r] = arr;").ast
			).toBeDefined();
			const { ast } = parse("a = b = c; d **= 2; e ??= f;");
			const chained =
				/** @type {import("estree").AssignmentExpression} */
				(
					/** @type {import("estree").ExpressionStatement} */ (ast.body[0])
						.expression
				);
			expect(chained.right.type).toBe("AssignmentExpression");
			expect(parse("function* g(){ const x = yield 1; }").ast).toBeDefined();
		});

		it("should reject invalid assignment targets", () => {
			expect(() => parse("1 = 2;")).toThrow(/Assigning to rvalue/);
			expect(() => parse("({a}) = b;")).toThrow(/Assigning to rvalue/);
		});
	});

	describe("binary expressions", () => {
		it("should keep private-in checks and delegate without ranges", () => {
			expect(
				parse("class C { #x; m(o){ return #x in o; } }").ast
			).toBeDefined();
			// a private name only reaches buildBinary's right side via a chain
			expect(() =>
				parse("class C { #x; m(o){ return o in #x in o; } }")
			).toThrow(/Private identifier can only be left side/);
			const { ast } = parse("a + b && c;", { ranges: false });
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
				expression("1 + 2 * 3 - 4;")
			);
			// ((1 + (2 * 3)) - 4): the same-precedence loop keeps left-association
			expect(sum.operator).toBe("-");
			const add = /** @type {import("estree").BinaryExpression} */ (sum.left);
			expect(add.operator).toBe("+");
			expect(add.right.type).toBe("BinaryExpression");
			expect(sum.range).toEqual([0, 13]);
			const coalesce = /** @type {import("estree").LogicalExpression} */ (
				expression("a ?? b ?? c;")
			);
			expect(coalesce.operator).toBe("??");
			expect(coalesce.left.type).toBe("LogicalExpression");
			const exponent = /** @type {import("estree").BinaryExpression} */ (
				expression("2 ** 3 ** 4;")
			);
			// `**` is right-associative via the recursive right-side climb
			expect(exponent.right.type).toBe("BinaryExpression");
		});

		it("should reject mixing ?? with && and || like acorn", () => {
			expect(() => parse("a ?? b || c;")).toThrow(/cannot be mixed/);
			expect(() => parse("a && b ?? c;")).toThrow(/cannot be mixed/);
		});

		it("should not read `in` as an operator in for-init position", () => {
			const { ast } = parse('for (var x = "a" in b) break;');
			expect(ast.body[0].type).toBe("ForInStatement");
			expect(
				/** @type {import("estree").ExpressionStatement} */ (
					parse('x = "a" in b;').ast.body[0]
				).expression.type
			).toBe("AssignmentExpression");
		});
	});

	describe("destructuring-errors record pool", () => {
		it("should keep raising expression errors from pooled records", () => {
			expect(() => parse("({x = 1});")).toThrow(
				/Shorthand property assignments are valid only in destructuring patterns/
			);
			expect(() => parse("f({x = 1});")).toThrow(
				/Shorthand property assignments are valid only in destructuring patterns/
			);
		});

		it("should parse nested own-record expressions and async arrows", () => {
			expect(parse("f(g(h(x = 1)), [y = 2] = z);").ast).toBeDefined();
			expect(parse("f(async (a = 1) => a, (b = 2) => b);").ast).toBeDefined();
			const { ast } = parse("r = async (q = 1) => q;");
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
			const { ast } = parse("a, b, c; f(...args); [...xs];");
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
			expect(parse("f(...args);", { ranges: false }).ast).toBeDefined();
		});

		it("should report stack overflow on pathological nesting like acorn", () => {
			expect(() => parse(`${"(".repeat(100000)}x`)).toThrow(
				/Not enough stack space to parse input/
			);
		});

		it("should check identifier parameter lists like acorn", () => {
			// sloppy simple functions allow duplicates; arrows and strict don't
			expect(parse("function f(a, a) { return a; }").ast).toBeDefined();
			expect(() => parse("(a, a) => a;")).toThrow(/Argument name clash/);
			expect(() => parse("'use strict'; function f(a, a) {}")).toThrow(
				/Argument name clash/
			);
			expect(() => parse("'use strict'; function f(eval) {}")).toThrow(
				/Binding eval in strict mode/
			);
		});

		it("should delegate pattern parameters to acorn's full walk", () => {
			expect(
				parse("function f({ a }, [b], c = 1, ...rest) { return a + b + c; }")
					.ast
			).toBeDefined();
			expect(() => parse("(a, { a }) => a;")).toThrow(/Argument name clash/);
		});
	});

	describe("subscript parsing", () => {
		it("should parse optional chains, private members and tagged templates", () => {
			expect(
				// eslint-disable-next-line no-template-curly-in-string
				parse("a?.b; a?.[b]; a?.(); x = f(a, b,); tag`x${1}`;").ast
			).toBeDefined();
			expect(
				parse("class P { #x = 1; m() { return this.#x; } }").ast
			).toBeDefined();
		});

		it("should reject optional chaining in new callees and template tags", () => {
			expect(() => parse("new a?.b();")).toThrow(
				/Optional chaining cannot appear in the callee/
			);
			expect(() => parse("a?.b`t`;")).toThrow(
				/Optional chaining cannot appear in the tag/
			);
		});

		it("should parse async arrows through the call subscript path", () => {
			expect(
				parse("const f = async (a, b = 1) => a + b; async(1, 2);").ast
			).toBeDefined();
			expect(() => parse("async (await) => 1;")).toThrow(
				/Cannot use 'await' as identifier inside an async function/
			);
		});

		it("should delegate to acorn without ranges and pre-2020 ecmaVersions", () => {
			expect(parse("a.b(c)[d];", { ranges: false }).ast).toBeDefined();
			const { ast } = parse("a.b(c);", { ecmaVersion: 10 });
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
			const program = parse("f(a, [b], { c: 1 });").ast;
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
			const { ast } = parse("[({})];");
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
			expect(op("a /= b;")).toBe("/=");
			expect(op("a %= b;")).toBe("%=");
			expect(op("a % b;")).toBe("%");
			expect(op("a **= b;")).toBe("**=");
			expect(op("a ** b;")).toBe("**");
			expect(op("a *= b;")).toBe("*=");
			expect(op("a ||= b;")).toBe("||=");
			expect(op("a || b;")).toBe("||");
			expect(op("a |= b;")).toBe("|=");
			expect(op("a | b;")).toBe("|");
			expect(op("a &&= b;")).toBe("&&=");
			expect(op("a && b;")).toBe("&&");
			expect(op("a &= b;")).toBe("&=");
			expect(op("a & b;")).toBe("&");
			expect(op("a ^= b;")).toBe("^=");
			expect(op("a ^ b;")).toBe("^");
			expect(op("++a;")).toBe("++");
			expect(op("a += b;")).toBe("+=");
			expect(op("a + b;")).toBe("+");
			expect(op("--a;")).toBe("--");
			expect(op("a -= b;")).toBe("-=");
			expect(op("a - b;")).toBe("-");
			expect(op("a <<= b;")).toBe("<<=");
			expect(op("a << b;")).toBe("<<");
			expect(op("a <= b;")).toBe("<=");
			expect(op("a < b;")).toBe("<");
			expect(op("a >>>= b;")).toBe(">>>=");
			expect(op("a >>> b;")).toBe(">>>");
			expect(op("a >>= b;")).toBe(">>=");
			expect(op("a >> b;")).toBe(">>");
			expect(op("a >= b;")).toBe(">=");
			expect(op("a > b;")).toBe(">");
			expect(op("a === b;")).toBe("===");
			expect(op("a == b;")).toBe("==");
			expect(op("a !== b;")).toBe("!==");
			expect(op("a != b;")).toBe("!=");
			expect(op("!a;")).toBe("!");
			expect(op("~a;")).toBe("~");
			expect(op("a ??= b;")).toBe("??=");
			expect(op("a ?? b;")).toBe("??");
		});

		it("should scan ?., conditional ? and ?. before a digit", () => {
			const chain =
				/** @type {{ expression: import("estree").ChainExpression }} */ (
					/** @type {unknown} */ (parse("a?.b;").ast.body[0])
				).expression;
			expect(chain.type).toBe("ChainExpression");
			// `?.` directly before a digit is a conditional, not optional chaining
			const conditional =
				/** @type {{ expression: import("estree").Expression }} */ (
					/** @type {unknown} */ (parse("a ?.5:b;").ast.body[0])
				).expression;
			expect(conditional.type).toBe("ConditionalExpression");
			expect(
				/** @type {{ expression: import("estree").Expression }} */ (
					/** @type {unknown} */ (parse("a ? b : c;").ast.body[0])
				).expression.type
			).toBe("ConditionalExpression");
		});

		it("should dispatch radix numbers, strings, templates and privates", () => {
			const values = parse("const a = [0xff, 0o17, 0b11, 0, \"d\", 's'];");
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
			expect(parse("`t`;").ast).toBeDefined();
			expect(
				parse("class A { #p; m() { return this.#p; } }").ast
			).toBeDefined();
			expect(() => parse("a = §;")).toThrow(/Unexpected character/);
		});

		it("should read a lone dot after a dot as a plain dot token", () => {
			// `..` misses the ellipsis check and lands on the plain-dot tail
			expect(() => parse("a..b;")).toThrow(/Unexpected token/);
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
			const script = parse("x <!--y\nz;");
			expect(script.comments.map((c) => c.value)).toEqual(["y"]);
			const module_ = parse("x <!--y;", { sourceType: "module" });
			expect(module_.comments).toHaveLength(0);
			// `-->` after a line break is a comment; `a-->b` stays `(a--) > b`
			const close = parse("a\n--> rest\nb;");
			expect(close.comments.map((c) => c.value)).toEqual([" rest"]);
			expect(op("a-->b;")).toBe(">");
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
			expect(op("a instanceof b;")).toBe("instanceof");
			expect(op("'x' in a;")).toBe("in");
			// same length/lowercase shape as keywords, but not keywords
			expect(parse("const instanceofX = 1; let doX = 2;").ast).toBeDefined();
			// capitalized, single-char, and >10-char words skip the keyword probe
			expect(
				parse("Function; x; internationalization; whileTrue;").ast.body
			).toHaveLength(4);
		});

		it("should still reject reserved words through the gate", () => {
			expect(() => parse("var enum = 1;")).toThrow(
				/The keyword 'enum' is reserved/
			);
			expect(() => parse('"use strict"; var implements = 1;')).toThrow(
				/The keyword 'implements' is reserved/
			);
			expect(parse("var synchronized = 1;").ast).toBeDefined();
			expect(() => parse("var if = 1;")).toThrow(/Unexpected keyword 'if'/);
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
			const { ast } = parse("const { a, b = 1, [c]: d, ...rest } = o;");
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
			expect(parse("({ a, b = 1, ...r } = o);").ast).toBeDefined();
		});

		it("should parse trailing commas and record-less objects", () => {
			expect(parse("({ a: 1, });").ast).toBeDefined();
			// no destructuring-errors record flows in through `typeof`
			expect(parse("typeof { a: 1 };").ast).toBeDefined();
		});

		it("should keep acorn's property error checks", () => {
			expect(() => parse("const { ...rest, a } = o;")).toThrow(
				/Comma is not permitted after the rest element/
			);
			expect(() => parse("({ ...a, b } = c);")).toThrow(
				/Comma is not permitted after the rest element/
			);
			expect(() => parse('x = { __proto__: 1, "__proto__": 2 };')).toThrow(
				/Redefinition of __proto__ property/
			);
			expect(() => parse("x = { a = 1 };")).toThrow(
				/Shorthand property assignments are valid only in destructuring/
			);
			expect(() => parse("x = { get g(a, b) {} };")).toThrow(/getter/);
		});

		it("should delegate object parsing without ranges", () => {
			const { ast } = parse("({ a: 1, ...s, m() {} });", { ranges: false });
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
				'if (typeof window === "undefined") { return; }\nmodule.exports = 1;'
			);
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("script");
			expect(ast.body[0].type).toBe("IfStatement");
		});

		it("should downgrade a bare top-level return without ranges", () => {
			const { ast, parses } = parseAuto("return 1;", { ranges: false });
			expect(parses).toBe(1);
			expect(ast.body[0].type).toBe("ReturnStatement");
		});

		it("should produce the same AST as an explicit script parse", () => {
			const code = "var x = 1;\nif (x) return;\nmodule.exports = x;";
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
				"async function g() { await x; }\nif (!y) return;"
			);
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("script");
		});

		it("should keep esm a single module parse", () => {
			const { ast, parses } = parseAuto("export const x = 1;");
			expect(parses).toBe(1);
			expect(ast.sourceType).toBe("module");
			expect(ast.body[0].type).toBe("ExportNamedDeclaration");
		});

		it.each([
			['import x from "./x";\nreturn;', "import"],
			["export const a = 1;\nreturn;", "export"],
			["await Promise.resolve();\nreturn;", "top-level await"],
			["import.meta.url;\nreturn;", "import.meta"]
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
				parseThroughJavascriptParser("class C { static { return; } }")
			).toThrow(/'return' outside of function/);
		});

		it("should still fall back to script for strict-only syntax", () => {
			// `with` is not handled by the in-place switch; the outer retry covers it
			const { ast, parses } = parseAuto(
				"with (obj) { x = 1; }\nmodule.exports = x;"
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
			expect(first('import defer * as ns from "x";')).toMatchObject({
				type: "ImportDeclaration",
				phase: "defer"
			});
			expect(first('import source src from "x";')).toMatchObject({
				type: "ImportDeclaration",
				phase: "source"
			});
		});

		it("should treat defer/source as the default name when followed by `from` or a comma", () => {
			const deferName =
				/** @type {import("estree").ImportDeclaration & { phase?: string }} */
				(first('import defer from "x";'));
			expect(deferName.phase).toBeUndefined();
			expect(deferName.specifiers[0].type).toBe("ImportDefaultSpecifier");
			const withNamed =
				/** @type {import("estree").ImportDeclaration} */
				(first('import source, { a } from "x";'));
			expect(withNamed.specifiers.map((s) => s.type)).toEqual([
				"ImportDefaultSpecifier",
				"ImportSpecifier"
			]);
		});

		it("should reject phase modifiers on the wrong specifier shape", () => {
			expect(() => first('import defer notNamespace from "x";')).toThrow(
				/'import defer' can only be used with namespace imports/
			);
			expect(() => first('import source * as ns from "x";')).toThrow(
				/'import source' can only be used with direct identifier specifier imports/
			);
			// a defer/source default name may only be followed by `* as`/`{…}`
			expect(() => first('import defer, x from "x";')).toThrow(
				/Unexpected token/
			);
			// a source phase rejects named specifiers after the default import
			expect(() => first('import source a, { b } from "x";')).toThrow(
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
			expect(declarationFor('const y = import.defer("x");')).toMatchObject({
				type: "ImportExpression",
				phase: "defer"
			});
			expect(declarationFor('const y = import.source("x");')).toMatchObject({
				type: "ImportExpression",
				phase: "source"
			});
		});

		it("should reject a phase meta-property that is not a dynamic import", () => {
			expect(() => first("const y = import.defer;")).toThrow(
				/'import\.defer' can only be used in a dynamic import/
			);
			expect(() => first('const y = new import.defer("x");')).toThrow(
				/import call cannot be the target of `new`/
			);
		});

		it("should keep acorn's import.meta checks under owned parsing", () => {
			expect(first("const y = import.meta;")).toMatchObject({
				type: "VariableDeclaration"
			});
			expect(() => first("const y = import.foo;")).toThrow(
				/only valid meta property for import is 'import\.meta'/
			);
			expect(() => first("const y = import.m\\u0065ta;")).toThrow(
				/'import\.meta' must not contain escaped characters/
			);
			expect(() =>
				first("const y = import.meta;", { sourceType: "script" })
			).toThrow(/Cannot use 'import\.meta' outside a module/);
		});

		it("should delegate import.meta and specifiers to acorn when phases are off", () => {
			expect(
				parse("const y = import.meta;", {
					sourceType: "module",
					importPhases: false
				}).ast.body[0].type
			).toBe("VariableDeclaration");
			expect(
				parse('import a from "x";', {
					sourceType: "module",
					importPhases: false
				}).ast.body[0].type
			).toBe("ImportDeclaration");
		});

		it("should locate the `import` of import.meta when acorn tracks locations", () => {
			for (const importPhases of [true, false]) {
				const declaration =
					/** @type {import("estree").VariableDeclaration} */ (
						parse("const y = import.meta;", {
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
				importDeclaration('import x from "x" with { type: "json" };').type
			).toBe("ImportDeclaration");
			expect(
				importDeclaration('import x from "x" assert { type: "json" };').type
			).toBe("ImportDeclaration");
			expect(importDeclaration('import x from "x" with {};').type).toBe(
				"ImportDeclaration"
			);
			expect(
				importDeclaration('import x from "x" with { type: "json", };').type
			).toBe("ImportDeclaration");
		});

		it("should read `assert` only as the legacy keyword it is", () => {
			// cspell:ignore ssert
			// A call on the next line is a statement of its own.
			const { body } = parse('import x from "x"\nassert(x);', {
				sourceType: "module"
			}).ast;
			expect(body.map((statement) => statement.type)).toEqual([
				"ImportDeclaration",
				"ExpressionStatement"
			]);
			expect(() =>
				parse('import x from "x" \\u0061ssert { type: "json" };', {
					sourceType: "module"
				})
			).toThrow(/Unexpected token/);
		});

		it("should reject a duplicate attribute key", () => {
			expect(() =>
				parse('import x from "x" with { type: "json", type: "js" };', {
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
		const code = "function f(a) { return a; } const g = (x) => x + 1;";
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
		Plugin.parse("function f(a, b) { return a + b; }", lazyOptions);
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
		const code = "for (let i = 0; i < 2; i++) f(i); while (a) b();";
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
				"switch (x) { default: a(); default: b(); }",
				lazyOptions
			)
		).toThrow(/Multiple default clauses/);
		// param-less catch (ES2019) parses
		const catchAst = WebpackParser.parse(
			"try { f() } catch { g() }",
			lazyOptions
		);
		expect(
			/** @type {EXPECTED_ANY} */ (catchAst.body[0]).handler.param
		).toBeNull();
		// for-await outside async context is rejected
		expect(() =>
			WebpackParser.parse("for await (const x of y) f(x);", lazyOptions)
		).toThrow(/Unexpected token/);
		// labeled loops resolve break/continue through the shared label records
		const labeled = WebpackParser.parse(
			"outer: for (;;) { for (;;) { continue outer; } break outer; }",
			lazyOptions
		);
		expect(labeled.body[0].type).toBe("LabeledStatement");
		expect(() => WebpackParser.parse("break missing;", lazyOptions)).toThrow(
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
		expect(() => WebpackParser.parse("eval = 1;", strictOptions)).toThrow(
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
			Plugin.parse('"use strict"; customBad = 1;', lazyOptions)
		).toThrow(/Assigning to customBad in strict mode/);
		expect(() =>
			Plugin.parse('"use strict"; eval = 1;', lazyOptions)
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
		const code = "const s = (a, b); f(1, [2, 3]);";
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
			"(((value))); (other);",
			"(first, (second), third); (fourth, fifth);",
			"() => (value); (first) => ((first));",
			"(first, second) => (first, second);",
			"(first = (value),) => (first);",
			"({ first = (value) }) => (first);",
			"(...values) => (values);",
			"(first) => (second) => (first, second);",
			"((first) => (first))((second));",
			"(value)\n(next);",
			"function* f() { return (yield (value)); }",
			"async function f() { return (await (value)); }"
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
			"();",
			"(value,);",
			"(...values);",
			"(...values,) => values;",
			"({ value = 1 });",
			"(value)\n=> value;",
			"((value)) => value;",
			"(first, first) => first;",
			"function* f() { return (value = yield 1) => value; }",
			"async function f() { return (value = await 1) => value; }"
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
			const code = "(first); (second) => (third); (fourth, fifth);";
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
			const ast = Plugin.parse("(value);", lazyOptions);
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
			...Plugin.tokenizer("a + { b: 1 };", {
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
		expect(labels(")/re/g")).toEqual([")", "regexp"]);
		expect(labels("a/b/g")).toEqual(["name", "/", "name", "/", "name"]);
	});

	it("finishes an unmatched closing paren before the parser rejects it", () => {
		// the token's context hook runs while tokenizing, so the root context is
		// left expecting an expression and only then does the parser refuse it
		expect(() => parse(")")).toThrow(/Unexpected token/);
		expect(() => parse("}")).toThrow(/Unexpected token/);
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
			"a === b && (c >>>= d) ** 2; /* c */ x ??= y; // trailing\n z >>> 1;";
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
		const code = "if (a) (b); while (c) { d } (function () {})();";
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
			"class A { #ahri = 1; get v() { return this.#ahri; } #\\u0062 = 2; #café = 3; }",
			lazyOptions
		);
		expect(ast.body[0].type).toBe("ClassDeclaration");
		expect(() =>
			WebpackParser.parse("class A { #a = this.#missing; }", lazyOptions)
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
			"debugger;",
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
		expect(JSON.stringify(WebpackParser.parse("let x = 1;", lazyOptions))).toBe(
			JSON.stringify(WebpackParser.parse("let x = 1;", slowOptions))
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
			"class A extends B { constructor() { super(); } static #p = 1; get g() { return A.#p; } static {} }";
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
		const code = "import { a, b as c } from 'm'; export { c as d };";
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
			"const value = 123; export function repeatedName(repeatedParameter) { return repeatedParameter + value + 0.5; }";

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

/** @typedef {{ type: { label: string }, value: unknown, start: number, end: number, loc?: object, range?: [number, number] }} TokenLike */
/** @typedef {Record<string, EXPECTED_ANY>} Options */
/** @typedef {{ file: string, code: string, options: Options, commonjs?: false, error?: string }} Corpus */
/** @typedef {{ file: string, code: string, options?: Options, error?: string }} RecordedCase */
/** @typedef {{ case: string, file: string, at: string, ours: string, acorn: string }} TreeDifference */
/** @typedef {{ case: string, file: string, webpack: string, acorn: string }} VerdictDifference */

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
// first hands a regexp literal to the host engine before validating it.
/** @type {[string, (code: string, options: Options) => EXPECTED_ANY, boolean][]} */
const PARSERS = [
	[
		"the parser a build runs",
		(code, options) =>
			webpackParse(
				code,
				/** @type {import("../../../lib/javascript/syntax-parser").ParserOptions} */ (
					options
				)
			),
		true
	],
	[
		"the ported base parser",
		(code, options) => Parser.parse(code, options),
		false
	]
];

// What is asked on top of the options each case carries. Ranges, locations and
// the two collectors are off in most of acorn's cases, and turning them on is
// what reaches webpack's lazy nodes and its own comment and token bookkeeping.
/** @type {[string, Options][]} */
const MODES = [
	["as acorn's own suite runs them", {}],
	[
		"with ranges, locations, comments and tokens",
		{ ranges: true, locations: true, onComment: true, onToken: true }
	],
	["as commonjs", { sourceType: "commonjs" }]
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

	for (const [parserName, parse, engineValidates] of PARSERS) {
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

			for (const [modeName, mode] of MODES) {
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

/** @type {[string, string][]} */
const PATTERNS = [
	// anchors, assertions and lookaround
	["^abc$", ""],
	["\\bword\\B", ""],
	["(?=a)(?!b)", ""],
	["(?<=a)(?<!b)", ""],
	["(?=a)*", ""],
	["(?=a)*", "u"],
	["(?<=a)+", ""],
	["\\b+", ""],
	["^*", ""],
	// quantifiers and braces
	["a*b+c?d{2}e{2,}f{2,3}", ""],
	["a*?b+?c??d{2}?e{2,}?f{2,3}?", ""],
	["a{3,2}", ""],
	["a{", ""],
	["a{", "u"],
	["a{1", ""],
	["a{1", "u"],
	["a{1,", "u"],
	["{1}", ""],
	["{1}", "u"],
	["}", ""],
	["}", "u"],
	["]", ""],
	["]", "u"],
	["a**", ""],
	["a+{2}", ""],
	["a{99999999999999999999}", ""],
	["a{4294967295}", "u"],
	// groups, names and backreferences
	["(a)(?:b)(?<name>c)\\1\\k<name>", ""],
	["(?<name>a)(?<name>b)", ""],
	["(?<name>a)|(?<name>b)", ""],
	["(?<name>a)|(?<name>b)", "u"],
	["(?:(?<x>a)|(?<x>b))\\k<x>", "u"],
	["(?<x>a)(?:(?<x>b))", "u"],
	["(?<x>a)(?:(?<x>b)|c)", "u"],
	// a name repeated across nested disjunctions, where the two are separated
	// only when one alternative of one disjunction rules the other out
	["(?:(?<x>a)|b)(?:(?<x>c)|d)", "u"],
	["(?:(?:(?<x>a)|b)|(?:(?<x>c)|d))", "u"],
	["(?:(?<x>a)|(?:(?<x>b)|c))", "u"],
	["(?:(?<x>a)|(?:b(?<x>c)))|(?<x>d)", "u"],
	["(?:(?:(?:(?<x>a))))|(?:(?:(?:(?<x>b))))", "u"],
	["(?:(?:(?:(?<x>a))))(?:(?:(?:(?<x>b))))", "u"],
	["(?<n>a)\\k<m>", ""],
	["(?<n>a)\\k<m>", "u"],
	["\\k<n>", ""],
	["\\k<n>", "u"],
	["\\k", ""],
	["\\k", "u"],
	["(?<n>a)\\k", ""],
	["(?<\\u{1d4d1}>a)", "u"],
	["(?<\\ud835\\udcd1>a)", ""],
	["(?<\\u{1d4d1}>a)", ""],
	["(?<\\u0041>a)", ""],
	["(?<>a)", ""],
	["(?<1a>a)", ""],
	["(?<a>a", ""],
	["(?<a", ""],
	["(?<a\\>a)", ""],
	["(?<$>a)\\k<$>", ""],
	["(?<_\\u200c>a)", "u"],
	["(a)\\2", ""],
	["(a)\\2", "u"],
	["\\1", ""],
	["\\1", "u"],
	["(a)\\1(b)\\2(c)\\3\\10", ""],
	["(?", ""],
	["(", ""],
	[")", ""],
	["(?i:a)", ""],
	["(?i:a)", "u"],
	["(?ims:a)", "v"],
	["(?-i:a)", "v"],
	["(?i-m:a)", "v"],
	["(?i-i:a)", "v"],
	["(?ii:a)", "v"],
	["(?-:a)", "v"],
	["(?g:a)", "v"],
	["(?i", "v"],
	["(?i:a", "v"],
	// character escapes
	["\\d\\D\\s\\S\\w\\W", ""],
	["\\cA\\cz", ""],
	["\\c1", ""],
	["\\c1", "u"],
	["\\c", ""],
	["\\c", "u"],
	["\\0", ""],
	["\\0", "u"],
	["\\01", ""],
	["\\01", "u"],
	["\\07", ""],
	["\\377\\400", ""],
	["\\8\\9", ""],
	["\\8", "u"],
	["\\x41\\x4", ""],
	["\\x4", "u"],
	["\\u0041\\u004", ""],
	["\\u004", "u"],
	["\\u{41}\\u{1F600}", "u"],
	["\\u{41}", ""],
	["\\u{110000}", "u"],
	["\\u{}", "u"],
	["\\u{", "u"],
	["\\ud83d\\ude00", "u"],
	["\\ud83d", "u"],
	["\\ud83d\\u0041", "u"],
	["\\/\\-\\a\\q", ""],
	["\\-", "u"],
	["\\a", "u"],
	["\\$\\^\\*\\+\\?\\.\\(\\)\\[\\]\\{\\}\\|\\\\\\/", "u"],
	["\\", ""],
	["\\", "u"],
	["\\u{1F600}", "v"],
	// dot and syntax characters
	["a.b", ""],
	["a.b", "s"],
	["*", ""],
	["+", ""],
	["?", ""],
	["|", ""],
	["a|", ""],
	["()", ""],
	["(|)", ""],
	// character classes
	["[abc][^abc][a-z][-a][a-][]", ""],
	["[a-z]", "u"],
	["[z-a]", ""],
	["[z-a]", "u"],
	["[\\d-z]", ""],
	["[\\d-z]", "u"],
	["[a-\\d]", ""],
	["[a-\\d]", "u"],
	["[\\b]", ""],
	["[\\-]", ""],
	["[\\-]", "u"],
	["[\\c_]", ""],
	["[\\c_]", "u"],
	["[\\c1]", ""],
	["[\\01]", ""],
	["[\\01]", "u"],
	["[\\8]", ""],
	["[\\8]", "u"],
	["[a", ""],
	["[a", "u"],
	["[\\ud83d\\ude00-\\ud83d\\ude4f]", "u"],
	["[\\ud83d\\ude00-\\ud83d\\ude4f]", ""],
	["[\\u{1F600}-\\u{1F64F}]", "u"],
	["[\\x41-\\x5a]", "u"],
	["[\\w-a]", ""],
	["[\\w-a]", "u"],
	["[a-\\w]", "u"],
	["[\\s-\\d]", ""],
	// unicode property escapes
	["\\p{L}\\P{L}", "u"],
	["\\p{L}", ""],
	["\\p{Letter}", "u"],
	["\\p{General_Category=Lu}", "u"],
	["\\p{gc=Lu}", "u"],
	["\\p{Script=Greek}", "u"],
	["\\p{sc=Grek}", "u"],
	["\\p{Script_Extensions=Latin}", "u"],
	["\\p{scx=Latn}", "u"],
	["\\p{Script=Kawi}", "u"],
	["\\p{Script=Nag_Mundari}", "u"],
	["\\p{Script=Garay}", "u"],
	["\\p{Script=Todhri}", "u"],
	["\\p{Emoji}", "u"],
	["\\p{Emoji_Presentation}", "u"],
	["\\p{Extended_Pictographic}", "u"],
	["\\p{ID_Compat_Math_Start}", "u"],
	["\\p{Any}\\p{ASCII}\\p{Assigned}", "u"],
	["\\p{Unknown}", "u"],
	["\\p{gc=Unknown}", "u"],
	["\\p{Script=Unknown}", "u"],
	["\\p{Script=}", "u"],
	["\\p{=Lu}", "u"],
	["\\p{}", "u"],
	["\\p{", "u"],
	["\\p", "u"],
	["\\p{L", "u"],
	["\\p{L=}", "u"],
	["\\p{Lu=Lu}", "u"],
	["\\p{Basic_Emoji}", "u"],
	["\\p{Basic_Emoji}", "v"],
	["\\p{RGI_Emoji}", "v"],
	["\\P{RGI_Emoji}", "v"],
	["[^\\p{RGI_Emoji}]", "v"],
	["[\\p{RGI_Emoji}]", "v"],
	["\\p{RGI_Emoji_Flag_Sequence}\\p{Emoji_Keycap_Sequence}", "v"],
	["[\\p{L}]", "u"],
	["[\\P{L}]", "u"],
	["[\\p{L}-a]", "u"],
	["\\p{L}", "v"],
	["(?i:\\P{Lu})", "v"],
	// unicode sets (v flag)
	["[\\p{L}--[a-z]]", "v"],
	["[\\p{L}&&\\p{Lu}]", "v"],
	["[[a-z]--[aeiou]]", "v"],
	["[[a-z]&&[aeiou]]", "v"],
	["[[a-z]--[aeiou]--[xyz]]", "v"],
	["[[a-z]&&[aeiou]&&[a]]", "v"],
	["[[a-z]--[aeiou]&&[a]]", "v"],
	["[[a-z]&&[aeiou]--[a]]", "v"],
	["[a--b]", "v"],
	["[a&&b]", "v"],
	["[a-z--b]", "v"],
	["[[a-z]--b]", "v"],
	["[\\q{abc|def|}]", "v"],
	["[\\q{abc}--\\q{abc}]", "v"],
	["[\\q{a}]", "u"],
	["[^\\q{ab}]", "v"],
	["[^\\q{a}]", "v"],
	["[\\q{ab}]", "v"],
	["[\\q{a\\u{1F600}}]", "v"],
	["[\\q{", "v"],
	["[\\q{a", "v"],
	["[\\q]", "v"],
	["[(]", "v"],
	["[)]", "v"],
	["[{]", "v"],
	["[}]", "v"],
	["[/]", "v"],
	["[-]", "v"],
	["[|]", "v"],
	["[!!]", "v"],
	["[&]", "v"],
	["[&&]", "v"],
	["[a&&&b]", "v"],
	["[a--]", "v"],
	["[--a]", "v"],
	["[a&&]", "v"],
	["[[a-z]", "v"],
	["[[a-z]]]", "v"],
	["[\\&\\-\\!\\#\\%\\,\\:\\;\\<\\=\\>\\@\\`\\~]", "v"],
	["[\\b\\B]", "v"],
	["[\\d-a]", "v"],
	["[a-\\d]", "v"],
	["[\\w&&\\d]", "v"],
	["[\\p{L}&&\\q{abc}]", "v"],
	["[[\\q{abc}]--[\\q{abc}]]", "v"],
	["[\\p{RGI_Emoji}--\\q{x}]", "v"],
	["[^[\\p{RGI_Emoji}]]", "v"],
	["[^[\\q{ab}]]", "v"],
	["[^[a]&&[\\q{ab}]]", "v"],
	["[\\u{1F600}-\\u{1F64F}]", "v"],
	["[z-a]", "v"],
	["[\\q{z}-a]", "v"],
	["[a-\\q{z}]", "v"],
	["\\p{Lowercase}", "v"],
	// annex B syntax in non-unicode mode
	["\\c", ""],
	["[\\c]", ""],
	["\\c-", ""],
	["a{,5}", ""],
	["a{,5}", "u"],
	["\\p{L}", ""],
	["(?=a){2}", ""],
	["(?<=a){2}", ""],
	["\\1(a)", ""],
	["\\10", ""],
	["\\10", "u"],
	["[\\10]", ""],
	["\\z\\Z", ""],
	["\\z", "u"],
	// whole-literal shapes the tokenizer decides
	["a\\/b", ""],
	["[/]", ""],
	["a", "g"],
	["a", "gimsuy"],
	["a", "gimsuyd"],
	["a", "dgimsvy"],
	["a", "uv"],
	["a", "gg"],
	["a", "x"],
	["a", "z"],
	["a", "d"],
	["a", "s"],
	["a", "y"],
	["a", "v"],
	["a", "u"],
	["", ""],
	["(?:)", "g"]
];

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
			for (const [pattern, flags] of PATTERNS) {
				const source = `/${pattern}/${flags};`;
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
				if (ours !== theirs) differences.push({ pattern, flags, ours, theirs });
				if (theirs !== "parsed") rejected++;
			}
			expect(differences).toEqual([]);
			// the corpus is meant to exercise the error paths, not only the happy ones
			expect(rejected).toBeGreaterThan(PATTERNS.length / 4);
		});
	}

	it("reports the flag errors before reading the pattern", () => {
		// the pattern is malformed too, so the flag error has to win the race
		expect(() => Parser.parse("/(/gg;", { ecmaVersion: 2024 })).toThrow(
			/Duplicate regular expression flag/
		);
		expect(() => Parser.parse("/(/x;", { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse("/(/uv;", { ecmaVersion: 2024 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse("/(/v;", { ecmaVersion: 2023 })).toThrow(
			/Invalid regular expression flag/
		);
		expect(() => Parser.parse("/(/v;", { ecmaVersion: 2024 })).toThrow(
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

/** @typedef {typeof import("../../../lib/javascript/syntax-parser")} ParserExports */
/** @typedef {Partial<import("../../../lib/javascript/syntax-parser").Options>} PortOptions */

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
	"var a = 1, b; let c = 2; const d = 3;",
	"if (a) b; else if (c) d; else { e; }",
	"for (var i = 0; i < 10; i++) { continue; }",
	"for (let [k, v] of map) {}\nfor (const k in obj) {}\nfor (;;) break;",
	"for (a in b) {}\nfor ((a) of b) {}\nfor (var x = 1 in y) {}",
	"lbl: for (;;) { inner: for (;;) { continue lbl; } break lbl; }",
	"while (x) do y; while (z)",
	"switch (a) { case 1: b; break; default: c; case 2: }",
	"try { a } catch { b } finally { c }",
	"try { a } catch (e) { b } catch2: {}",
	"try { a } catch ({ message }) { b }",
	"throw new Error('x')",
	"with (obj) { a }",
	"debugger;",
	"function f(a, b = 1, ...rest) { return a }",
	"function* g() { yield; yield 1; yield* h(); }",
	"async function h() { await x; for await (const y of z) {} }",
	"function f() { 'use strict'; with (a) {} }",
	"function f() { 'a'; 'use strict'; 010 }",
	"function f() { 'use\\x20strict'; with (a) {} }",
	"'use strict'; var let = 1;",
	"var let = 1; let\nx = 2;",
	"let\n[a] = b;",
	"var yield = 1; var await = 2; var async = 3; async\nfunction f() {}",
	"class A extends B { constructor() { super(); } static s() {} get g() {} set s(v) {} #p = 1; static #q; static { this.x } m() { return #p in this } }",
	"class A { 'constructor'() {} static constructor() {} async *[Symbol.iterator]() {} }",
	"class A { static async method() { await 1 } }",
	"class A { field; static field2 = 2; ['computed'] = 3 }",
	"var o = { a, b: 1, [c]: 2, d() {}, get e() {}, set e(v) {}, async f() {}, *g() {}, async *h() {}, ...spread, __proto__: null };",
	"var o = { __proto__: 1, __proto__: 2 };",
	"({ __proto__: 1, __proto__: 2 } = x);",
	"var [a, , b = 1, ...c] = d; var { e, f: g, h = 2, ...i } = j;",
	"[a, b] = [b, a]; ({ a, b } = c); [a.b, c[d]] = e;",
	"(a, b) => a + b; a => { return a }; async (a) => await a; async a => a; () => {};",
	"(a = 1, { b }, [c], ...d) => 0",
	"var f = (a, b) => (c, d) => e;",
	"x = a ? b : c ? d : e;",
	"x = a ?? b; x = a?.b?.[c]?.(d); x = a?.b.c(); x = (a?.b).c;",
	"x = a || b && c | d ^ e & f == g != h === i !== j < k > l <= m >= n << o >> p >>> q + r - s * t / u % v ** w;",
	"x = -a ** 2; x = (-a) ** 2; x = 2 ** -1;",
	"x = !a; x = ~a; x = +a; x = -a; x = typeof a; x = void a; x = delete a.b; x = ++a; x = a--;",
	"a += 1; a -= 1; a *= 1; a /= 1; a %= 1; a **= 1; a <<= 1; a >>= 1; a >>>= 1; a &= 1; a |= 1; a ^= 1; a &&= 1; a ||= 1; a ??= 1;",
	"x = a.b.c[d](e)(f)`g`; x = new A; x = new A(); x = new A.B(); x = new (a())(); x = new new A()();",
	"x = a\n(b)\n[c]\n`d`",
	"x = `a${b}c${`d${e}f`}g`; x = tag`a${b}\\u{1F600}`; x = tag`\\unicode`;",
	"x = /ab+c/gi; x = /[/]/; x = a / b / c; x = /=/; x = a /=/ b/;",
	"x = 010; x = 08; x = 0b101; x = 0o17; x = 0xff; x = 1e3; x = .5; x = 5.; x = 1_000; x = 0.5e-3; x = 10n; x = 0x1fn;",
	"x = 'a\\nb\\x41\\u0041\\u{41}\\0\\\nc'; x = \"\\'\\\"\"; x = '\\08';",
	"x = '\\1';",
	"var \\u0061bc = 1; var \\u{62} = 2; var ℮ = 3; var \\u{1d4d1} = 4; var ゛ = 5;",
	"x = this; x = null; x = true; x = false; x = undefined; x = NaN;",
	"x = (a, b); x = (a); x = ((a));",
	"x = a in b; for (var i = (a in b); ;) break;",
	"x = { a: 1 } . a; x = [ 1, , 2, ...a ];",
	"function f() { return\n1 }",
	"a\n++b",
	"a = b\n(c)",
	"if (a) function f() {}",
	"label: function f() {}",
	"x = function f() { f = 1 }; x = function () {}; x = async function () {}; x = function* () {};",
	"x = class {}; x = class A extends (B) {};",
	"new.target",
	"function f() { new.target }",
	"x = { get [a]() {}, set [b](v) {}, async [c]() {}, *[d]() {} }",
	"x = a => a\n=> b",
	"(function () { 'use strict'; })(); (() => { 'use strict' })();",
	"#!/usr/bin/env node\nx = 1;",
	"<!-- html comment\nx = 1; --> also\n",
	"/* block */ x = 1; // line\n/** doc */ y = 2; /*\nmulti\n*/",
	"x = a\n/b/g",
	"x = { if: 1, class: 2, function: 3 }; x.if; x.class;",
	"x = a.#b;",
	"async () => { for await (x of y) {} }",
	"(async function* () { yield await 1; })();",
	"x = a ? b : c => d;",
	"x = (a, b, c) => 1;",
	"x = ((a)) => 1;",
	"x = ([a]) => 1; x = ({a}) => 1; x = ({a = 1}) => 1;",
	"x = { a = 1 } = b;",
	"[a = 1, { b = 2 }] = c;",
	"x = a?.b`c`;",
	"x = new a?.b();",
	"x = a?.[b] = 1;",
	"x = (a?.b) = 1;",
	"x = a.b = c;",
	"x = 1 = 2;",
	"x = a++ = 1;",
	"++a++;",
	"x = { a: 1 } = 2;",
	"x = [1] = 2;",
	"x = (a) = 1;",
	"((a)) = 1;",
	"({a}) = 1;",
	"([a]) = 1;",
	"x = yield;",
	"function* g() { var yield; }",
	"function* g() { yield\n* 1 }",
	"async function f() { var await; }",
	"async function f() { await\n1 }",
	"function f(a, a) {}",
	"'use strict'; function f(a, a) {}",
	"function f(a = 1) { 'use strict' }",
	"let a; let a;",
	"let a; var a;",
	"var a; let a;",
	"{ let a; var a; }",
	"function f() {} let f;",
	"switch (x) { case 1: let a; case 2: let a; }",
	"try {} catch (e) { let e; }",
	"try {} catch (e) { var e; }",
	"try {} catch ([e]) { var e; }",
	"for (let a of b) { var a; }",
	"label: label: x;",
	"break;",
	"continue;",
	"return;",
	"x = { a: 1, a: 2 };",
	"'use strict'; x = { a: 1, a: 2 };",
	"'use strict'; 010;",
	"'use strict'; '\\08';",
	"'use strict'; eval = 1; arguments = 2; var eval;",
	"'use strict'; var implements; var package = 1;",
	"var implements; var package = 1;",
	"class A { constructor() {} constructor() {} }",
	"class A { get constructor() {} }",
	"class A { static prototype() {} }",
	"class A { #a; #a; }",
	"class A { #constructor; }",
	"class A { m() { this.#missing } }",
	"class A extends B { constructor() { super.x; } } class C { m() { super(); } }",
	"function f() { super.x }",
	"x = { m() { super.x } }",
	"a?.b = 1;",
	"a?.`b`;",
	"new a?.b;",
	"x = a ?? b || c;",
	"x = a || b ?? c;",
	"x = (a || b) ?? c;",
	"x = 1n + 2;",
	"x = 08n;",
	"x = 1_;",
	"x = 1__0;",
	"x = 0_1;",
	"x = 0x_1;",
	"x = 1e_1;",
	"x = 1.e1;",
	"x = 3in [];",
	"x = 3.toString();",
	"x = 'unterminated",
	"x = `unterminated",
	"x = /unterminated",
	"x = /a/gg;",
	"x = /a/z;",
	"x = /(?<n>a)\\k<m>/;",
	"x = /\\u{110000}/u;",
	"/* unterminated",
	"x = @;",
	"x = #;",
	"x = a.;",
	"x = a..b;",
	"x = ...a;",
	"f(...a, ...b, c,);",
	"f(,);",
	"function f(,) {}",
	"function f(...a,) {}",
	"(...a,) => 1",
	"(a,) => 1",
	"({...a,}) => 1",
	"x = { ...a, };",
	"[...a,] = b;",
	"[...a, b] = c;",
	"import a from 'a'; import * as b from 'b'; import { c, d as e, 'f' as g } from 'c'; import 'd'; import h, { i } from 'e'; import j, * as k from 'f';",
	"export default 1; export default function () {}",
	"export default function f() {} export function g() {} export class C {} export const a = 1, b = 2; export { a, b as c, d as 'e' }; export * from 'x'; export * as ns from 'y'; export { f } from 'z';",
	"export default async function () {} export default class {}",
	"export default (a, b);",
	"export { a }; var a;",
	"export { undefinedName };",
	"export var a; export var a;",
	"import a from 'a'; var a;",
	"import a from 'a'; import a from 'b';",
	"import { default } from 'a';",
	"import { a as default } from 'a';",
	"import.meta; import('x'); import('x', { with: { type: 'json' } });",
	"import a from 'a' with { type: 'json' }; export * from 'b' with { type: 'json' };",
	"import a from 'a' assert { type: 'json' };",
	"import a from 'a' with { type: 'json', type: 'x' };",
	"import a from 'a' with { 'type': 'json', [x]: 1 };",
	"new import('x')",
	"import('x', {}, extra)",
	"import()",
	"import.foo",
	"await 1;",
	"for await (x of y) {}",
	"x = await\n1;",
	"async () => await\n1",
	"x = { async\nm() {} }",
	"x = { async *m() {} }",
	"x = { get\na() {} }",
	"class A { async\nm() {} }",
	"class A { static\nm() {} static\n() {} }",
	"class A { static static() {} async async() {} get get() {} set set(v) {} }",
	"class A { 'a'() {} 1() {} [2]() {} }",
	"class A { a\nb }",
	"class A { a = 1\nb = 2 }",
	"class A { a; b() {} }",
	"class A { a = arguments }",
	"class A { a = () => arguments }",
	"class A { static { arguments } }",
	"class A { static { await } }",
	"class A { static { return } }",
	"class A { static { var await } }",
	"x = class { static #a; static m() { return this.#a } }",
	"var using = 1; using = 2; using\nx = 3;",
	"x = a ? b => c : d;",
	"x = a ? (b) => c : d => e;",
	"x = (a ? b : c) => d;",
	"async (a = await 1) => a",
	"async (a = yield) => a",
	"function* g() { (a = yield) => a }",
	"function f(a = arguments) {}",
	"'use strict'; function f(a = 1) {}",
	"function f(a = 1) { 'use strict'; }",
	"x = function(a = 1) { 'use strict'; }",
	"x = (a = 1) => { 'use strict'; }",
	"x = { m(a = 1) { 'use strict' } }",
	"class A { m(a = 1) { 'use strict' } }",
	"x = ((a, b)) => 1;",
	"x = (a, b) = 1;",
	"x = 1, a) => 2;",
	"x = a.b.c.d.e.f.g.h;",
	"x = a[b][c][d];",
	"x = a\n.b\n.c;",
	"x\n++\ny",
	"x\n--\ny",
	"throw\nx",
	"return\nx",
	"x = a, b = c, d;",
	"var a = b, c = d;",
	"let [a] = [1], { b } = { b: 2 };",
	"const a;",
	"const [a] = b, c;",
	"for (const a; ;) {}",
	"for (let a = 1, b; ; ) break;",
	"for (let of of []) {}",
	"for (let\nof of []) {}",
	"for (async of []) {}",
	"for (async of => 1;;) break;",
	"for (let.x of []) {}",
	"for (let in x) {}",
	"for (var a of b, c) {}",
	"for (a, b of c) {}",
	"for (a of b, c) {}",
	"for (var [a] = 1 of b) {}",
	"for (var a = 1 of b) {}",
	"for (const a = 1 in b) {}",
	"'use strict'; for (var a = 1 in b) {}",
	"if (a) let x = 1;",
	"if (a) class C {}",
	"if (a) const x = 1;",
	"if (a) async function f() {}",
	"while (a) function f() {}",
	"do function f() {} while (a)",
	"do x; while (a) y;",
	"do x\nwhile (a) y",
	"{ function f() {} function f() {} }",
	"'use strict'; { function f() {} function f() {} }",
	"{ function f() {} var f; }",
	"function f() { function g() {} let g; }",
	"function f() { let g; function g() {} }",
	"{ async function f() {} async function f() {} }",
	"{ function* f() {} function* f() {} }",
	"'use strict'; if (a) function f() {}",
	"async function f() { function await() {} }",
	"function* g() { function yield() {} }",
	"function f() { yield: 1 }",
	"'use strict'; function f() { yield: 1 }",
	"function* g() { yield: 1 }",
	"function f() { await: 1 }",
	"async function f() { await: 1 }",
	"await: 1",
	"x = { await: 1, yield: 2, async: 3, let: 4, static: 5 }; x.await; x.yield;",
	"x = { a: 1 }?.a;",
	"x = a?.b\n`c`",
	"x = a\n?.b",
	"x = a ?. 5 : 6;",
	"x = a?.5:6;",
	"x = 1?.5:6;",
	"x = a?.b?.c?.d;",
	"x = a?.b.c?.d.e;",
	"x = a?.[b?.c];",
	"delete a?.b;",
	"delete a;",
	"'use strict'; delete a;",
	"'use strict'; delete (a);",
	"'use strict'; delete ((a));",
	"delete this.#a;",
	"class A { #a; m() { delete this.#a } }",
	"class A { #a; m() { delete this?.#a } }",
	"class A { #a; m() { delete (this.#a) } }",
	"class A { #a; m() { #a in this; #a in #a in this; 1 + #a in this } }",
	"class A { #a; m() { #a } }",
	"class A { #a; m() { (#a) in this } }",
	"class A { m() { #a in this } }",
	"class A { #a; static m() { class B { n() { this.#a } } } }",
	"class A { #a; static m() { class B { #a; n() { this.#a } } } }",
	"class A { static #a() {} static m() { A.#a(); } }",
	"class A { get #a() {} set #a(v) {} }",
	"class A { get #a() {} get #a() {} }",
	"class A { get #a() {} static set #a(v) {} }",
	"class A { #a() {} get #a() {} }",
	"x = { #a: 1 };",
	"x = this.#a;",
	"class A { a = this.#b; #b = 1; }",
	"class A { #a = this.#b; }",
	"class A extends B { #a = super.b; }",
	"class A { static #a = A.#a; }",
	"class A extends (class {}) {}",
	"class A extends B, C {}",
	"class A extends async () => {} {}",
	"class A extends null {}",
	"class A extends new B {}",
	"class A extends B() {}",
	"class A extends B?.C {}",
	"class A extends a.b.c {}",
	"class A extends (a, b) {}",
	"class A {} class A {}",
	"'use strict'; class A {} class A {}",
	"class A { constructor() { super() } }",
	"class A extends B { m() { super() } }",
	"class A extends B { constructor() { () => super() } }",
	"class A extends B { constructor() { function f() { super() } } }",
	"class A extends B { constructor() { class C { constructor() { super() } } } }",
	"class A extends B { constructor() { class C extends D { constructor() { super() } } } }",
	"class A extends B { m = super() }",
	"class A extends B { m = () => super.x }",
	"class A extends B { static { super.x } }",
	"class A extends B { static { super() } }",
	"x = { m() { super() } }",
	"x = { m: function () { super.x } }",
	"x = { m() { () => super.x } }",
	"x = { m() { function f() { super.x } } }",
	"x = { get m() { super.x } }",
	"x = { m: () => super.x }",
	"function f() { new.target }",
	"x = () => new.target",
	"class A { m = new.target }",
	"class A { static { new.target } }",
	"function f() { () => new.target }",
	"new.target",
	"new.foo",
	"new.target = 1",
	"function f() { new.target = 1 }",
	"x = a\n`b`",
	"x = a`b`\n`c`",
	"x = `${a}${b}`",
	"x = `\\u{`",
	"x = `\\u{110000}`",
	"x = `\\08`",
	"x = tag`\\u{`",
	"x = tag`\\08`",
	"x = tag`\\1`",
	"x = `\\1`",
	"x = `${}`",
	"x = `${a`",
	"x = `${a}",
	"x = `${a}}`",
	"x = `${{}}`",
	"x = `${a}${`${b}`}`",
	"x = a ?? `b`",
	"x = `\r\n\n\r\u2028\u2029`",
	"x = '\r\n'",
	"x = 'a\u2028b'",
	"x = '\\\r\n'",
	"x = '\\\u2028'",
	"x = 'a\\\rb'",
	"x = '\\u{}'",
	"x = '\\u{110000}'",
	"x = '\\u{1F600}'",
	"x = '\\x'",
	"x = '\\x4'",
	"x = '\\u'",
	"x = '\\u00'",
	"x = '\\u004'",
	"x = '\\u{41'",
	"x = '\\9'",
	"x = '\\09'",
	"x = '\\8'",
	"'use strict'; x = '\\8';",
	"'use strict'; x = '\\0';",
	"'use strict'; x = '\\00';",
	"function f() { '\\08'; 'use strict'; }",
	"function f() { 'use strict'; '\\08'; }",
	"function f() { 'use strict'; }\n'\\08'",
	"x = 'a' 'b'",
	"x = 1 2",
	"x = a b",
	"x = ,",
	"x = )",
	"x = ]",
	"x = }",
	"x = {",
	"x = [",
	"x = (",
	"x = ;",
	"x = ",
	"",
	";;;",
	"\n\n\n",
	"\uFEFFx = 1;",
	"x = 1;\uFEFF",
	"x\u200B = 1;",
	"x = \u2028 1;",
	"x = \u00A0 1;",
	"x = \uFEFF 1;",
	"x = \u1680 1;",
	"x = \u180E 1;",
	"\\u0061 = 1;",
	"\\u{61} = 1;",
	"\\u{110000} = 1;",
	"a\\u{62} = 1;",
	"a\\u0062 = 1;",
	"v\\u0061r a = 1;",
	"\\u0076ar a = 1;",
	"x = { \\u0061: 1 };",
	"x.\\u0061;",
	"x = tru\\u0065;",
	"x = t\\u0072ue;",
	"x = n\\u0075ll;",
	"x = th\\u0069s;",
	"x = typ\\u0065of a;",
	"\\u0069f (a) {}",
	"x = { i\\u0066: 1 }.i\\u0066;",
	"cl\\u0061ss A {}",
	"x = cl\\u0061ss {}",
	"\\u0066unction f() {}",
	"x = \\u0066unction () {}",
	"\\u0061sync function f() {}",
	"x = \\u0061sync () => 1;",
	"x = \\u0061sync\nfunction f() {}",
	"function* g() { yi\\u0065ld 1 }",
	"function* g() { y\\u0069eld 1 }",
	"async function f() { \\u0061wait 1 }",
	"f\\u006fr (;;) break;",
	"x = a\\u002eb;",
	"x = \\u0024;",
	"x = \\u005f;",
	"x = \\u0030;",
	"x = a\\u0030;",
	"x = \\u{2118}\\u{212E};",
	"x = \\u{1D4C1}\\u{1D4C2};",
	"x = ⅵ;",
	"x = \u2118;",
	"x = ℘;",
	"x = ℮;",
	"x = \u309B;",
	"x = ゛;",
	"x = \u{10000};",
	"x = 𐀀;",
	"x = \u{E0001};",
	"x = \uD800;",
	"x = \uDC00;",
	"x = '\uD800';",
	"x = \uD83D;",
	"x = 𝐀;",
	"x = \u{2B740};",
	"x = 𫝀;",
	"x = a\u200C\u200D;",
	"x = \u200C;",
	"x = a\u00B7;",
	"x = \u00B7;",
	"x = a\u0300;",
	"x = \u0300;",
	"x = a\u1885;",
	"x = \u1885;",
	"x = a\u2118;",
	"x = a\u309B;",
	"x = a\uFE00;",
	"x = \uFE00;",
	"x = a\u{E0100};",
	"x = a\u2170;",
	"x = \u2170;",
	"x = a\u2160;",
	"x = a\u212E;",
	"x = a\u2E2F;",
	"x = \u2E2F;",
	"x = \u2E2Fa;",
	// explicit resource management
	"using x = a; await using y = b;",
	"function f() { using x = a; using y = b, z = c; }",
	"async function f() { await using x = a; }",
	"function f() { await using x = a; }",
	"function f() { using x; }",
	"function f() { using [x] = a; }",
	"if (a) using x = b;",
	"lbl: using x = y;",
	"switch (a) { case 1: using x = y; }",
	"switch (a) { case 1: { using x = y; } }",
	"for (using x of y) {}",
	"async function f() { for (await using x of y) {} }",
	"function f() { for (await using x of y) {} }",
	"async function f() { for await (using x of y) {} }",
	"async function f() { for await (await using x of y) {} }",
	"for (using x in y) {}",
	"for (using x = a;;) {}",
	"for (using x = a, y = b; x; x++) {}",
	"for (using of y) {}",
	"for (using of = 1;;) break;",
	"for (using of == 1;;) break;",
	"for (using of => 1;;) break;",
	"for (using\nof y) {}",
	"for (using in y) {}",
	"function f() { using\nx = 1; }",
	"using = 1; using(x); using.x; using[0]; using++; using instanceof x;",
	"function f() { using \\u0078 = 1; }",
	"function f() { using in = 1; }",
	"function f() { using await = 1; }",
	"async function f() { await using\nx = 1; }",
	"async function f() { await using = 1; }",
	// destructuring and assignment targets
	"({ a = 1 });",
	"x = { a = 1 };",
	"f({ a = 1 });",
	"let { a } = b; let \\u0061 = 1;",
	"({...{a}} = b);",
	"({ get a() {} } = b);",
	"[...a = 1] = b;",
	"[a += 1] = b;",
	"[(a = 1)] = b;",
	"({ a: (b = 1) } = c);",
	"(...a, b) => 1;",
	"(a, ...b, c) => 1;",
	"function f({ a: [b] }, [{ c }]) {}",
	"let let = 1;",
	"const let = 1;",
	"let [let] = a;",
	"[a?.b] = c;",
	"for (a?.b of c) {}",
	"({ a: b?.c } = d);",
	"let [a.b] = c;",
	"function f([a.b]) {}",
	"let [(a)] = b;",
	"[(a)] = b; [((a))] = b;",
	"x = ((a) = 1);",
	"(a = 1) ? b : c;",
	"[({ __proto__: 1, __proto__: 2 })] = x;",
	"switch ({ __proto__: 1, __proto__: 2 }) {}",
	"if ({ __proto__: 1, __proto__: 2 }) {}",
	"x = { ['__proto__']: 1, __proto__: 2 };",
	"x = { 1: 1, 1: 2, '1': 3 };",
	"(a, b,) => 1;",
	"[a, b,] = c;",
	"async function f() { (await) => 1 }",
	"async (await) => 1;",
	"async function f() { async (a = await 1) => a }",
	"async function f() { ({ await } = x); }",
	"async function f() { x = { await }; }",
	"async function f() { [await] = x; }",
	"x = (); x = (a,); x = (...a);",
	"x = { 1 };",
	"x = { 'a' };",
	"({ a() {} } = b);",
	"x = { *a };",
	"x = { async a };",
	"x = { async *a };",
	"x = { get a(b) {} };",
	"x = { set a() {} };",
	"x = { set a(...b) {} };",
	"function f(...a, b) {}",
	"let [...a, b] = c;",
	// statements
	"if (a) { import b from 'c'; }",
	"function f() { export const x = 1; }",
	"break 1;",
	"continue 1;",
	"a: { break a; }",
	"a: { continue a; }",
	"a: b: while (1) { break a; continue b; }",
	"a: while (1) { b: { break a; } }",
	"async function f() { for await (;;) {} }",
	"async function f() { for await (x in y) {} }",
	"async function f() { for await (var x = 1;;) {} }",
	"async function f() { for await (let x of y) {} }",
	"for (let a, b of c) {}",
	"for (var a, b in c) {}",
	"switch (a) { default: default: }",
	"switch (a) { x; }",
	"try {}",
	"let [a]; let { b };",
	"var 1 = 2;",
	"{ {} }",
	"x = {{}};",
	"{ { a } }",
	"x = async\n(a) => 1;",
	"x = async\nfunction () {};",
	"async\n(a);",
	// classes
	"class A { ; m() {} ; }",
	"class A { static 'prototype'() {} }",
	"class A { 'constructor' = 1 }",
	"class A { *constructor() {} }",
	"class A { async constructor() {} }",
	"class A { get a(b) {} }",
	"class A { set a() {} }",
	"class A { set a(...b) {} }",
	"class A { constructor = 1 }",
	"class A { static prototype = 1 }",
	"class A { static constructor = 1 }",
	"class {}",
	"class A extends B { m() { super; } }",
	"class A extends B { m() { super.#a } }",
	// modules
	"export * as 'string name' from 'x';",
	"export * as ns from 5;",
	"export * from 5;",
	"export { a } from 'b' with { type: 'json' };",
	"export { a } from 5;",
	"export { 'a' };",
	"export { 'a' as b };",
	"export default class A {}",
	"export default class A extends B {}",
	"export const [a, { b }, ...c] = d; export let { e = 1, ...f } = g;",
	"export var [a = 1, [b]] = c;",
	"export { a, }; var a;",
	"export { a as b, c as d, }; var a, c;",
	"import { a, } from 'b';",
	"import { a as b, } from 'b';",
	"import a from 'b' with { type: 'json', };",
	"import a from 5;",
	"import 5;",
	"export { a as '\\uD800' }; var a;",
	"export { a as '\\uD83D\\uDE00' }; var a;",
	"im\\u0070ort('a');",
	"import('x',);",
	"import('x', {},);",
	"import('x', {}, );",
	"import.m\\u0065ta;",
	"x = \\u006Eew A;",
	"function f() { new.tar\\u0067et }",
	"function f() { \\u006Eew.target }",
	// tokens
	"// a\r\nx = 1;",
	"/* a\r\nb */ x = 1;",
	"x = 1;\n--> comment\ny = 2;",
	"x = 1;\n  --> comment",
	"/* a */ --> b\nx = 1;",
	"x = 1 --> 0;",
	"x = a\n--> b",
	"x = /a\nb/;",
	"x = /a/\\u0067;",
	"x = /a/g\\u0069;",
	"x = 0x1g;",
	"x = 0b12;",
	"x = 0o8;",
	"x = 0xg;",
	"x = 0x;",
	"x = 0b;",
	"x = 1a;",
	"x = 1_a;",
	"x = 1.a;",
	"x = 1e;",
	"x = 1n_;",
	"x = 08.5;",
	"x = 09n;",
	"x = `a\r\nb`;",
	"x = `a$b`; x = `$`; x = `a$`;",
	"x = tag`\\u{\r\n$x`;",
	"x = tag`\\1\n\r\n\r`;",
	"x = tag`\\1",
	"x = tag`\\1${a}\\2`;",
	"x = tag`\\1$`;",
	"x = tag`\\1${`;",
	"x = '\\r\\t\\b\\v\\f';",
	"x = a ? /b/ : /c/; x = [/a/, /=b/];",
	"x = a\n/b/\n/c/",
	"x = { a: /b/ };",
	"x = f(/a/, /b/);",
	"x = !/a/;",
	"x = typeof /a/;",
	"x = `${/a/}`;",
	"if (/a/) /b/;",
	"switch (/a/) { case /b/: }",
	"x = a++ / 2; x = a-- /2/ 1;",
	"x = a\n++/b/i.test(c)",
	// second pass over the grammar's remaining branches
	"let a\\u0062 = 1;",
	"function f() { using a\\u0062 = 1; }",
	"for (async of x) {}",
	"for ((async) of x) {}",
	"for (\\u0061sync of x) {}",
	"async function f() { for await (using x in y) {} }",
	"if (a) function* f() {}",
	"label: function* f() {}",
	"class A { get; set; }",
	"class A { get = 1; set() {} static get; }",
	"import a from 'b' with { type: json };",
	"async function f() { [\\u0061wait] = 1 }",
	"async function f() { ({ \\u0061wait } = 1) }",
	"async function f() { \\u0061wait = 1 }",
	"async function f() { (\\u0061wait) => 1 }",
	"(a.b) => 1;",
	"([a.b]) => 1;",
	"([(a)]) => 1;",
	"({ a: (b) }) => 1;",
	"++a?.b;",
	"a?.b++;",
	"for (a?.b in c) {}",
	"([...a.b]) => 1;",
	"([...[a]]) => 1;",
	"function f(...[a]) {}",
	"function f(...{ a }) {}",
	"function f(a, b,) {}",
	"function f() { return\n{ a } }",
	"function f() { return { a } }",
	"function* g() { yield\n{ a: 1 } }",
	"function* g() { yield { a: 1 } }",
	"for (x of\n{}) {}",
	"x = !{ __proto__: 1, __proto__: 2 };",
	"x = typeof { __proto__: 1, __proto__: 2 };",
	"x = a + { __proto__: 1, __proto__: 2 };",
	"x = { __proto__: 1, __proto__: 2, a: b = 1 };",
	"[(a), b] = c;",
	"x = [(a), b];",
	"x = #a in b;",
	"class A { #a; m() { for (#a in this;;) {} } }",
	"class A { #a; m() { x = (#a) in this } }",
	"x = [a,].b;",
	"x = [a,].b = c;",
	"x = (...a);",
	"x = (a, ...b);",
	"class A extends B { constructor() { new super; } }",
	"class A extends B { constructor() { new super(); } }",
	"let { ...a, b } = c;",
	"function f({ ...a, b }) {}",
	"x = { *a: 1 };",
	"x = { async a: 1 };",
	"let { a() {} } = b;",
	"x = { *get a() {} };",
	"x = { async get a() {} };",
	"x = { await };",
	"async ({ await }) => 1;",
	"function f() { x = { await }; async () => 1; }",
	"x = tag`\\1\\2`;",
	"x = tag`\\1\\``;",
	"x = `\\8`;",
	"x = `\\9`;",
	"x = '\\777'; x = '\\400'; x = '\\377';",
	"x = '\\7'; x = '\\77'; x = '\\08a';",
	"x = a\\b;",
	"x = \\x;",
	"x = a ? function () {} : b;",
	"x = a ? class {} : b;",
	"x = { a: function () {} };",
	"switch (a) { case function () {}: }",
	"x = a ? function : b;",
	"x = { a: function };"
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
	["script, es2021 with hashbang", { ecmaVersion: 2021, allowHashBang: true }]
];

/**
 * A tree, comment or token as plain data, so acorn's and ours compare by value.
 * @param {unknown} value what to convert
 * @returns {unknown} the plain data
 */
const plain = (value) =>
	JSON.parse(
		JSON.stringify(value, (key, v) => {
			if (typeof v === "bigint") return `${v}n`;
			if (v instanceof RegExp) return { regexp: v.source, flags: v.flags };
			if (key === "type" && v && typeof v === "object" && "label" in v) {
				return { label: v.label };
			}
			return v;
		})
	);

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

	describe("static entry points", () => {
		it("parses an expression at an offset like acorn", () => {
			const source = "let x = a ? b : c; // rest";
			/** @type {PortOptions} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain(Parser.parseExpressionAt(source, 8, options))).toEqual(
				plain(acornPort.Parser.parseExpressionAt(source, 8, options))
			);
		});

		it("tokenizes like acorn", () => {
			const source = "let x = /re/g + `t${y}` .5 0b1 'a' // c\nb";
			/** @type {PortOptions} */
			const options = { ecmaVersion: "latest", locations: true, ranges: true };
			expect(plain([...Parser.tokenizer(source, options)])).toEqual(
				plain([...acornPort.Parser.tokenizer(source, options)])
			);
			const tokenizer = Parser.tokenizer("a b", { ecmaVersion: 2020 });
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
			const ast = Extended.parse("a + b * c", { ecmaVersion: 2020 });
			expect(ast.type).toBe("Program");
			expect(parses).toBe(1);
			expect(plain(ast)).toEqual(
				plain(
					acornPort.Parser.extend(counting).parse("a + b * c", {
						ecmaVersion: 2020
					})
				)
			);
		});

		it("normalizes options like acorn", () => {
			const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			try {
				expect(Parser.parse("x", {}).type).toBe("Program");
				expect(Parser.parse("y", {}).type).toBe("Program");
				expect(warn).toHaveBeenCalledTimes(1);
				expect(warn.mock.calls[0][0]).toMatch(/ecmaVersion is required/);
			} finally {
				warn.mockRestore();
			}
			expect(() =>
				Parser.parse("x", {
					ecmaVersion: "latest",
					sourceType: "commonjs",
					allowAwaitOutsideFunction: true
				})
			).toThrow(/allowAwaitOutsideFunction with sourceType: commonjs/);
			expect(() =>
				acornPort.Parser.parse("x", {
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
			const source = "a\nb\nf(c,)\nx = [d,]\nreturn";
			/** @type {(parse: typeof Parser.parse) => unknown[][]} */
			const eventsOf = (parse) => {
				/** @type {unknown[][]} */
				const events = [];
				parse(source, {
					ecmaVersion: "latest",
					locations: true,
					allowReturnOutsideFunction: true,
					onInsertedSemicolon: (end, loc) =>
						events.push(["semicolon", end, plain(loc)]),
					onTrailingComma: (end, loc) => events.push(["comma", end, plain(loc)])
				});
				return events;
			};
			const ours = eventsOf((code, opts) => Parser.parse(code, opts));
			expect(ours).not.toHaveLength(0);
			expect(ours).toEqual(
				eventsOf((code, opts) => acornPort.Parser.parse(code, opts))
			);
		});

		it("appends to a program node the caller continues", () => {
			const program = acornPort.Parser.parse("a;", { ecmaVersion: 2020 });
			const continued = Parser.parse("b;", { ecmaVersion: 2020, program });
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

const { toEstreeObject } = require("../../../lib/javascript/syntax");
const {
	Field,
	Flag,
	NodeType,
	Part,
	SyntaxTree,
	WebpackParser
} = require("../../../lib/javascript/syntax-parser");
/** @typedef {import("../../../lib/javascript/syntax-parser").Node} EstreeNode */

/**
 * A parsed node whose children may already stand as the ids they were written as.
 * @typedef {{ type: string, [key: string]: unknown }} WrittenNode
 */

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

const SCRIPT = `
var a = 1, b; let c; const d = 2;
function* generate(x = 1, { y, z: [w, , ...v] }, ...rest) { yield* x; yield; }
function strict() { "use strict"; }
async function run() { await a; for await (const x of y) {} }
const arrow = async (p) => (p ? 1 : 2);
const K = class Named extends Base {
	#hidden = 1; static s; static { this.t = 1; }
	method() { return #hidden in this && super.x; }
	get g() { return 1; } set g(value) {}
};
function F() { new.target; }
outer: for (let i = 0; i < 1; i++) { if (i) continue outer; else break outer; }
for (const k in o); for (x of y) {}
while (a) a--; do ++a; while (false);
with (o) { p; }
switch (a) { case 1: break; default: }
try { throw new Error("e"); } catch ({ message }) {} finally { debugger; }
try {} catch {}
o?.p?.[q]?.(r);
tag\`a\${b}c\`; \`x\${y}\`;
a = b += c ?? d; e || (f && g);
[a, , b] = [1, , ...c]; ({ a, b: e = 1, ...f } = { a, [b]: 1, get c() {}, d() {} });
x = /re/gi; y = 10n; z = null; t = true; u = 1.5e3; s = "s";
(a, b); void 0; typeof a; delete o.p; -a; !a; ~a;
(function () { return; })();
`;

const MODULE = `
import a, { b as c, "d" as e } from "x" with { type: "json" };
import * as ns from "y";
import defer * as lazy from "z";
export const f = 1;
export default class extends a {}
export { f as g, c };
export * as h from "x";
export * from "x" with { type: "json" };
await import("x", { with: { type: "json" } });
import.meta.url;
import.defer("x");
`;

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
				const rebuilt = toEstreeObject(tree, write(tree, program, seen));
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
			const rebuilt = toEstreeObject(tree, tree.addEstree(asEstree(program)));
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
		const source = 'import a from "x"; export * from "y"; export { a };';
		const program = WebpackParser.parse(source, {
			ecmaVersion: 2020,
			sourceType: "module"
		});
		const tree = new SyntaxTree();
		const root = tree.addEstree(program);
		for (let i = 0; i < 3; i++) {
			const statement = tree.field(i, Field.body, root);
			expect(tree.fieldCount(Field.attributes, statement)).toBe(0);
			expect(
				/** @type {EXPECTED_ANY} */ (toEstreeObject(tree, statement)).attributes
			).toEqual([]);
		}
	});

	it("builds only the fields asked for, then the rest on the same object", () => {
		const { tree, node } = writeExpression("f(a, b);");
		const call = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(tree, node, ["callee"])
		);
		expect(call.callee.name).toBe("f");
		expect("arguments" in call).toBe(false);
		expect(toEstreeObject(tree, node)).toBe(call);
		expect(
			call.arguments.map((/** @type {EXPECTED_ANY} */ arg) => arg.name)
		).toEqual(["a", "b"]);
		expect(call.optional).toBe(false);
		expect(toEstreeObject(tree, node, ["callee"])).toBe(call);
		expect(call.range).toEqual([0, 7]);
		call.range = [1, 6];
		expect(call.range).toEqual([1, 6]);
	});

	it("reads a literal's regex and bigint forms when asked for alone", () => {
		const regex = writeExpression("/a/g;");
		const literal = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(regex.tree, regex.node, ["regex"])
		);
		expect(literal.regex).toEqual({ pattern: "a", flags: "g" });
		expect("value" in literal).toBe(false);
		const bigint = writeExpression("10n;");
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(bigint.tree, bigint.node))
				.bigint
		).toBe("10");
	});

	it("clears a flag and starts over after reset", () => {
		const tree = new SyntaxTree();
		const member = tree.add(NodeType.MemberExpression, 0, 4);
		tree.set(member, "computed", true);
		tree.set(member, "computed", false);
		const before = /** @type {EXPECTED_ANY} */ (
			toEstreeObject(tree, member, ["computed"])
		);
		expect(before.computed).toBe(false);
		tree.reset();
		expect(tree.add(NodeType.ThisExpression, 0, 4)).toBe(member);
		expect(tree.type(member)).toBe(NodeType.ThisExpression);
		expect(toEstreeObject(tree, member)).not.toBe(before);
		expect(toEstreeObject(tree, 0)).toBeNull();
	});

	it("reads a field never set, or set to none, as empty", () => {
		const tree = new SyntaxTree();
		const block = tree.add(NodeType.BlockStatement, 0, 2);
		const name = tree.add(NodeType.Identifier, 0, 1);
		tree.set(name, "name", null);
		const statement = tree.add(NodeType.ExpressionStatement, 0, 2);
		tree.set(statement, "directive", undefined);
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(tree, block)).body
		).toEqual([]);
		expect(
			/** @type {EXPECTED_ANY} */ (toEstreeObject(tree, name)).name
		).toBeNull();
		expect(
			"directive" in /** @type {EXPECTED_OBJECT} */ (toEstreeObject(tree, statement))
		).toBe(false);
		const literal = tree.add(NodeType.Literal, 0, 1);
		expect(tree.name(name)).toBe("");
		expect(tree.value(literal)).toBe("");
		expect(tree.textOf(Part.directive, statement)).toBeNull();
		expect(tree.fieldCount(Field.expression, statement)).toBe(0);
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
		let object = /** @type {EXPECTED_ANY} */ (toEstreeObject(tree, node));
		while (object.type === "UnaryExpression") object = object.argument;
		expect(object.name).toBe("a");
	});

	it("reads a node as the CSS and HTML paths read theirs", () => {
		const { tree, node } = writeExpression("a[b](1, /x/g, ...c);");
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

	it("refuses an unknown type or field", () => {
		const tree = new SyntaxTree();
		expect(() => tree.add(0, 0, 1)).toThrow(/Unknown node type/);
		const node = tree.add(NodeType.Identifier, 0, 1);
		expect(() => tree.set(node, "value", 1)).toThrow(/has no field value/);
	});
});

describe("JavaScript SourceProcessor", () => {
	const { SourceProcessor } = require("../../../lib/javascript/syntax");

	/** @typedef {import("../../../lib/javascript/syntax-parser").JavascriptPath} JavascriptPath */

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
			.process("f(`a${b}c`, d);");
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
			'import x from "y";\nlabel: for (const k of o) a?.[k];\u2028function f(z, y = 1) { return `t${z}`; }';
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
		processor.process("function f(a) { b; } c; stop; d;");
		processor.process("e;");
		expect(names).toEqual(["c", "stop", "e"]);
	});

	it("reads a script as a script, and refuses a walk inside a walk", () => {
		/** @type {number[]} */
		const types = [];
		const processor = new SourceProcessor().use({
			[NodeType.WithStatement]: (path) => {
				types.push(path.type());
				expect(() => processor.process("x;")).toThrow(/already running/);
			}
		});
		processor.process("with (o) x;", { sourceType: "script" });
		expect(types).toEqual([NodeType.WithStatement]);
		expect(() => processor.process("with (o) x;")).toThrow(SyntaxError);
		expect(() => processor.process("x;")).not.toThrow();
	});
});

describe("WebpackParser writing a SyntaxTree", () => {
	const {
		SyntaxTree,
		WebpackParser,
		toEstreeObject
	} = require("../../../lib/javascript/syntax-parser");

	/** @type {ParserOptions} */
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
		expect(plain(toEstreeObject(tree, program))).toEqual(
			plain(new WebpackParser(options, source).parse())
		);
	});

	it.each([
		"({ ...{ a } } = b);",
		"({ get a() {} } = b);",
		"[...a = 1] = b;",
		"[a += 1] = b;",
		"[a?.b] = c;",
		"[f()] = b;",
		"(a, a) => 1;",
		"async function f() { ({ await } = x); }",
		"({ a: b.c }) => 1;",
		"for ((a?.b) of c);"
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
