"use strict";

// cspell:ignore ypeof averyvery ahri aafom Unsyntactic retag

const JavascriptParser = require("../lib/javascript/JavascriptParser");
const { SoaAst } = require("../lib/javascript/syntax");

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
			// comments carry no `loc` — locations derive from offsets
			expect(comments[1].loc).toBeUndefined();
		});

		it("should memoize comment ranges and accept explicit writes", () => {
			const { comments } = parse("// a\n// b\n");
			const range = comments[0].range;
			expect(range).toEqual([0, 4]);
			// memoized second read returns the same array
			expect(comments[0].range).toBe(range);
			comments[0].range = [1, 2];
			expect(comments[0].range).toEqual([1, 2]);
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
						/** @type {import("../lib/Dependency").RealDependencyLocation} */
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

		it("should delegate radix, exponent, separator and bigint literals to acorn", () => {
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
		});

		it("should delegate escapes to acorn", () => {
			expect(literal('var x = "a\\nb"').value).toBe("a\nb");
			expect(literal("var x = 'it\\'s'").value).toBe("it's");
			expect(literal('var x = "a\\\n b"').value).toBe("a b");
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
		 * @returns {string[]} every Identifier name in program order
		 */
		const names = (code) => {
			/** @type {string[]} */
			const found = [];
			JSON.stringify(parse(code).ast, (_key, value) => {
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
			const { WebpackParser } = require("../lib/javascript/syntax");

			let calls = 0;
			class Plugin extends WebpackParser {
				/**
				 * @param {import("acorn").Node} node started statement node
				 * @returns {import("acorn").Node} if statement
				 */
				parseIfStatement(node) {
					calls++;
					return super.parseIfStatement(node);
				}

				/**
				 * @param {import("acorn").Node} node started statement node
				 * @returns {import("acorn").Node} return statement
				 */
				parseReturnStatement(node) {
					calls++;
					return super.parseReturnStatement(node);
				}
			}
			const code = "if (a) { b(); } var x = 1; function f() { return x; }";
			const ast = Plugin.parse(
				code,
				/** @type {import("acorn").Options} */ (
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
			const { tokTypes } = require("acorn");
			const { WebpackParser } = require("../lib/javascript/syntax");

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

		it("should keep HTML comment forms on acorn's delegated path", () => {
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

	describe("auto source type module->script fallback", () => {
		const { WebpackParser } = require("../lib/javascript/syntax");

		/**
		 * @param {string} code source
		 * @param {object=} options extra parse options
		 * @returns {{ ast: import("../lib/javascript/JavascriptParser").ParseResult["ast"], parses: number }} result and acorn parse count
		 */
		const parseAuto = (code, options) => {
			const proto =
				/** @type {{ parse: () => unknown }} */
				(/** @type {unknown} */ (WebpackParser.prototype));
			const spy = jest.spyOn(proto, "parse");
			try {
				const { ast } = parse(code, { sourceType: "auto", ...options });
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
				expect(() => parse(code, { sourceType: "auto" })).toThrow(
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
				parse("class C { static { return; } }", { sourceType: "auto" })
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

	describe("function grammar fast path", () => {
		it("should build single-shape nodes for declarations, expressions and arrows", () => {
			const { ast } = parse(
				"function f(a) { return a; }\nvar g = function named() {};\nvar h = (a, b) => a + b;\nvar i = async x => x;"
			);
			const [f, g, h, i] = /** @type {EXPECTED_ANY[]} */ (ast.body);
			expect(f.type).toBe("FunctionDeclaration");
			expect(f.id.name).toBe("f");
			expect(f.generator).toBe(false);
			expect(f.async).toBe(false);
			expect(f.expression).toBe(false);
			expect(f.range).toEqual([0, 27]);
			expect(g.declarations[0].init.type).toBe("FunctionExpression");
			expect(g.declarations[0].init.id.name).toBe("named");
			const arrow = h.declarations[0].init;
			expect(arrow.type).toBe("ArrowFunctionExpression");
			expect(arrow.id).toBeNull();
			expect(arrow.expression).toBe(true);
			const asyncArrow = i.declarations[0].init;
			expect(asyncArrow.async).toBe(true);
			expect(asyncArrow.params[0].name).toBe("x");
		});

		it("should keep acorn's enumeration order on function nodes", () => {
			const { ast } = parse("function f() {}");
			expect(Object.keys(ast.body[0])).toEqual([
				"type",
				"start",
				"end",
				"id",
				"expression",
				"generator",
				"async",
				"params",
				"body"
			]);
		});

		it("should parse generators, async functions and methods", () => {
			const { ast } = parse(
				"async function* ag(a = 1, ...rest) { yield await a; }\n({ m() {}, get g() { return 1; }, set s(v) {}, *gen() {}, async am() {} });"
			);
			const ag = /** @type {EXPECTED_ANY} */ (ast.body[0]);
			expect(ag.generator).toBe(true);
			expect(ag.async).toBe(true);
			const props = /** @type {EXPECTED_ANY} */ (ast.body[1]).expression
				.properties;
			expect(
				props.map((/** @type {EXPECTED_ANY} */ p) => p.value.type)
			).toEqual([
				"FunctionExpression",
				"FunctionExpression",
				"FunctionExpression",
				"FunctionExpression",
				"FunctionExpression"
			]);
			expect(props[3].value.generator).toBe(true);
			expect(props[4].value.async).toBe(true);
		});

		it("should allow super property access in object methods", () => {
			const { ast } = parse("({ m() { return super.x; } });");
			expect(ast.body[0].type).toBe("ExpressionStatement");
		});

		it("should keep acorn's early errors", () => {
			// hanging generator declaration
			expect(() => parse("if (x) function* f() {}")).toThrow(
				/Unexpected token/
			);
			// strict directive with non-simple params
			expect(() => parse("function f(a = 1) { 'use strict'; }")).toThrow(
				/Illegal 'use strict' directive/
			);
			// duplicate params: sloppy simple ok, strict rejected
			expect(parse("function f(a, a) {}").ast).toBeDefined();
			expect(() => parse("'use strict'; function f(a, a) {}")).toThrow(
				/Argument name clash/
			);
			expect(() => parse("function f(a, [a]) {}")).toThrow(
				/Argument name clash/
			);
			// strict-mode function name re-check
			expect(() => parse("'use strict'; function eval() {}")).toThrow(
				/Binding eval in strict mode/
			);
			// yield in generator default params
			expect(() => parse("function* g(a = yield) {}")).toThrow(
				/Yield expression cannot be a default value/
			);
		});

		it("should keep acorn's paren and arrow-head errors", () => {
			expect(() => parse("()")).toThrow(/Unexpected token/);
			expect(() => parse("(,)")).toThrow(/Unexpected token/);
			expect(() => parse("(a,)")).toThrow(/Unexpected token/);
			expect(() => parse("(...a)")).toThrow(/Unexpected token/);
			expect(() => parse("(a, ...b)")).toThrow(/Unexpected token/);
			expect(() => parse("(a, ...b,) => 0")).toThrow(
				/Comma is not permitted after the rest element/
			);
		});

		it("should distinguish parens from arrow heads", () => {
			const { ast } = parse(
				"(a, b);\n(x, ...y) => 0;\n(c,) => c;\nvar v = (d);"
			);
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			expect(body[0].expression.type).toBe("SequenceExpression");
			expect(body[1].expression.type).toBe("ArrowFunctionExpression");
			expect(body[1].expression.params[1].type).toBe("RestElement");
			expect(body[2].expression.type).toBe("ArrowFunctionExpression");
			expect(body[3].declarations[0].init.type).toBe("Identifier");
		});

		it("should serve ParenthesizedExpression under preserveParens", () => {
			const { WebpackParser } = require("../lib/javascript/syntax");

			const ast = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					"(a, b);",
					/** @type {import("acorn").Options} */ (
						/** @type {unknown} */ ({
							ecmaVersion: "latest",
							sourceType: "script",
							preserveParens: true,
							lazyNodes: true
						})
					)
				)
			);
			expect(ast.body[0].expression.type).toBe("ParenthesizedExpression");
			expect(ast.body[0].expression.expression.type).toBe("SequenceExpression");
		});

		it("should set the directive prologue on function bodies", () => {
			const { ast } = parse("function f() { 'use strict'; return this; }");
			const body = /** @type {EXPECTED_ANY} */ (ast.body[0]).body.body;
			expect(body[0].directive).toBe("use strict");
		});

		it("should keep the function fast path off for parser plugins overriding inlined methods", () => {
			const { WebpackParser } = require("../lib/javascript/syntax");

			let calls = 0;
			class Plugin extends WebpackParser {
				/**
				 * @param {EXPECTED_ANY} node function node
				 * @param {boolean} allowDuplicates whether duplicates are allowed
				 * @returns {void}
				 */
				checkParams(node, allowDuplicates) {
					calls++;
					// @ts-expect-error acorn's internal method is untyped
					return super.checkParams(node, allowDuplicates);
				}
			}
			const ast = /** @type {EXPECTED_ANY} */ (
				Plugin.parse(
					"function f(a) {} (b) => b;",
					/** @type {import("acorn").Options} */ (
						/** @type {unknown} */ ({
							ecmaVersion: "latest",
							sourceType: "script",
							lazyNodes: true
						})
					)
				)
			);
			expect(calls).toBeGreaterThan(0);
			expect(ast.body[0].type).toBe("FunctionDeclaration");
		});

		it("should delegate the function grammar below ES2017", () => {
			const { ast } = parse("function* g(a) { yield a; }", {
				ecmaVersion: 6
			});
			const g = /** @type {EXPECTED_ANY} */ (ast.body[0]);
			expect(g.type).toBe("FunctionDeclaration");
			expect(g.generator).toBe(true);
		});
	});

	describe("statement grammar fast path", () => {
		it("should build single-shape loop, switch and try nodes", () => {
			const { ast } = parse(
				"for (let i = 0; i < 3; i++) f(i);\n" +
					"for (const k in o) g(k);\n" +
					"for (const v of a) h(v);\n" +
					"while (a) b();\n" +
					"do c(); while (d);\n" +
					"switch (x) { case 1: a(); break; default: b(); }\n" +
					"try { a(); } catch (e) { b(e); } finally { c(); }\n" +
					"debugger;\n;\n" +
					"l: for (;;) { continue l; }"
			);
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			expect(body.map((s) => s.type)).toEqual([
				"ForStatement",
				"ForInStatement",
				"ForOfStatement",
				"WhileStatement",
				"DoWhileStatement",
				"SwitchStatement",
				"TryStatement",
				"DebuggerStatement",
				"EmptyStatement",
				"LabeledStatement"
			]);
			expect(body[2].await).toBe(false);
			expect(body[5].cases).toHaveLength(2);
			expect(body[5].cases[1].test).toBeNull();
			expect(body[6].handler.param.name).toBe("e");
			expect(body[9].body.body.body[0].type).toBe("ContinueStatement");
			expect(body[0].range).toEqual([0, 33]);
		});

		it("should parse for-await, bare catch and with", () => {
			const { ast } = parse(
				"async function f() { for await (const c of chunks) use(c); }\n" +
					"try { a(); } catch { b(); }\n" +
					"with (obj) { y = 1; }"
			);
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			const forAwait = body[0].body.body[0];
			expect(forAwait.type).toBe("ForOfStatement");
			expect(forAwait.await).toBe(true);
			expect(body[1].handler.param).toBeNull();
			expect(body[2].type).toBe("WithStatement");
		});

		it("should keep Annex B for-in initializers and reject the rest", () => {
			expect(parse("for (var x = 1 in y) ;").ast).toBeDefined();
			expect(() => parse("for (let x = 1 in y) ;")).toThrow(
				/may not have an initializer/
			);
			expect(() => parse("for (var [a] = [] in y) ;")).toThrow(
				/may not have an initializer/
			);
			expect(() => parse("for (let x of a, b) ;")).toThrow(/Unexpected token/);
		});

		it("should keep acorn's statement early errors", () => {
			expect(() => parse("throw\nnew Error()")).toThrow(
				/Illegal newline after throw/
			);
			expect(() => parse("switch (x) { default: a(); default: b(); }")).toThrow(
				/Multiple default clauses/
			);
			expect(() => parse("try { a(); }")).toThrow(
				/Missing catch or finally clause/
			);
			expect(() => parse("for (;;) { continue missing; }")).toThrow(
				/Unsyntactic continue/
			);
			expect(() => parse("break;")).toThrow(/Unsyntactic break/);
			expect(() => parse("s: switch (x) { case 1: continue s; }")).toThrow(
				/Unsyntactic continue/
			);
			expect(() => parse("'use strict'; with (obj) {}")).toThrow(
				/'with' in strict mode/
			);
			expect(() => parse("l: l: for (;;) ;")).toThrow(
				/Label 'l' is already declared/
			);
			expect(() => parse("try {} catch ([a, a]) {}")).toThrow(
				/already been declared/
			);
			expect(() =>
				parse("async function f() { for await (x in y) ; }")
			).toThrow(/Unexpected token/);
		});
	});

	describe("class and expression-tail fast paths", () => {
		it("should parse class declarations, fields, private names and static blocks", () => {
			const { ast } = parse(
				"class C extends B {\n" +
					"  static sf = 1;\n" +
					"  f = 2;\n" +
					"  #p = 3;\n" +
					"  static { init(); }\n" +
					"  constructor() { super(); }\n" +
					"  m() { return this.#p; }\n" +
					"  static get g() { return 1; }\n" +
					"  *gen() {}\n" +
					"  async am() {}\n" +
					"}\n" +
					"var D = class {};"
			);
			const c = /** @type {EXPECTED_ANY} */ (ast.body[0]);
			expect(c.type).toBe("ClassDeclaration");
			expect(c.superClass.name).toBe("B");
			expect(
				c.body.body.map((/** @type {EXPECTED_ANY} */ el) => el.type)
			).toEqual([
				"PropertyDefinition",
				"PropertyDefinition",
				"PropertyDefinition",
				"StaticBlock",
				"MethodDefinition",
				"MethodDefinition",
				"MethodDefinition",
				"MethodDefinition",
				"MethodDefinition"
			]);
			expect(c.body.body[2].key.type).toBe("PrivateIdentifier");
			expect(c.body.body[4].kind).toBe("constructor");
			expect(c.body.body[7].value.generator).toBe(true);
			expect(
				/** @type {EXPECTED_ANY} */ (ast.body[1]).declarations[0].init.id
			).toBeNull();
		});

		it("should keep acorn's class early errors", () => {
			expect(() =>
				parse("class A { constructor() {} constructor() {} }")
			).toThrow(/Duplicate constructor/);
			expect(() => parse("class A { static prototype() {} }")).toThrow(
				/static property named prototype/
			);
			expect(() => parse("class A { get constructor() {} }")).toThrow(
				/Constructor can't have get\/set modifier/
			);
			expect(() => parse("class A { *constructor() {} }")).toThrow(
				/Constructor can't be a generator/
			);
			expect(() => parse("class A { constructor = 1; }")).toThrow(
				/field named 'constructor'/
			);
			expect(() => parse("class A { #constructor; }")).toThrow(
				/element named '#constructor'/
			);
			expect(() => parse("class A { #x; #x; }")).toThrow(
				/already been declared/
			);
			expect(() => parse("class A { #x; m() { return #y in this; } }")).toThrow(
				/must be declared in an enclosing class/
			);
			expect(() => parse("class A { get g(a) {} }")).toThrow(
				/getter should have no params/
			);
			expect(() => parse("class A { set s() {} }")).toThrow(
				/setter should have exactly one param/
			);
		});

		it("should treat modifier names as element names when unaccompanied", () => {
			const { ast } = parse(
				"class A { static() {} async() {} get() {} set() {} static static() {} }"
			);
			const names = /** @type {EXPECTED_ANY} */ (ast.body[0]).body.body.map(
				(/** @type {EXPECTED_ANY} */ el) =>
					`${el.static ? "s:" : ""}${el.key.name}`
			);
			expect(names).toEqual(["static", "async", "get", "set", "s:static"]);
		});

		it("should build ChainExpression and SequenceExpression single shapes", () => {
			const { ast } = parse("a?.b.c?.[d]?.(e);\nx = (a, b, c);");
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			expect(body[0].expression.type).toBe("ChainExpression");
			expect(body[0].expression.range).toEqual([0, 16]);
			const seq = body[1].expression.right;
			expect(seq.type).toBe("SequenceExpression");
			expect(seq.expressions).toHaveLength(3);
		});

		it("should keep expression-list holes and spread positions", () => {
			const { ast } = parse("f(...a, b);\nconst xs = [1, , 3, ...rest,];");
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			expect(body[0].expression.arguments[0].type).toBe("SpreadElement");
			const elements = body[1].declarations[0].init.elements;
			expect(elements).toHaveLength(4);
			expect(elements[1]).toBeNull();
			expect(elements[3].type).toBe("SpreadElement");
		});

		it("should parse computed, numeric and string property names", () => {
			const { ast } = parse('({ ["c" + k]: 1, 42: 2, "s": 3, id: 4 });');
			const props = /** @type {EXPECTED_ANY} */ (ast.body[0]).expression
				.properties;
			expect(props.map((/** @type {EXPECTED_ANY} */ p) => p.computed)).toEqual([
				true,
				false,
				false,
				false
			]);
			expect(props[1].key.value).toBe(42);
		});
	});

	describe("export, yield/await and LVal fast paths", () => {
		/**
		 * @param {string} code module source
		 * @returns {EXPECTED_ANY} program body
		 */
		const moduleBody = (code) => parse(code, { sourceType: "module" }).ast.body;

		it("should parse all export forms", () => {
			const body = moduleBody(
				'export const a = 1, [b] = x;\nexport default function () {}\nexport * as ns from "m";\nexport { a as y, a as "z-str" };\nexport { d } from "m";'
			);
			expect(body.map((/** @type {EXPECTED_ANY} */ s) => s.type)).toEqual([
				"ExportNamedDeclaration",
				"ExportDefaultDeclaration",
				"ExportAllDeclaration",
				"ExportNamedDeclaration",
				"ExportNamedDeclaration"
			]);
			expect(body[2].exported.name).toBe("ns");
			expect(body[3].specifiers[1].exported.value).toBe("z-str");
			expect(body[4].source.value).toBe("m");
		});

		it("should keep acorn's export errors", () => {
			const moduleParse = (/** @type {string} */ code) =>
				parse(code, { sourceType: "module" });
			expect(() => moduleParse("export default 1; export default 2;")).toThrow(
				/Duplicate export 'default'/
			);
			expect(() =>
				moduleParse("export const a = 1; export { a as a };")
			).toThrow(/Duplicate export 'a'/);
			expect(() =>
				moduleParse("export const [a, {b}] = x; export { b as a };")
			).toThrow(/Duplicate export 'a'/);
			expect(() => moduleParse('export { "str" };')).toThrow(
				/string literal cannot be used as an exported binding/
			);
			expect(() => moduleParse("export { missing };")).toThrow(
				/Export 'missing' is not defined/
			);
		});

		it("should parse yield and await forms on single shapes", () => {
			const { ast } = parse(
				"function* g() { yield; yield 1; yield* inner(); }\nasync function a() { return await p; }"
			);
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			const yields = body[0].body.body.map(
				(/** @type {EXPECTED_ANY} */ s) => s.expression
			);
			expect(yields[0].argument).toBeNull();
			expect(yields[0].delegate).toBe(false);
			expect(yields[1].argument.value).toBe(1);
			expect(yields[2].delegate).toBe(true);
			expect(body[1].body.body[0].argument.type).toBe("AwaitExpression");
		});

		it("should retag assignment destructuring targets in place", () => {
			const { ast } = parse(
				"({ a, b: [c = 1], ...rest } = o);\n[x.y, ...z] = xs;"
			);
			const body = /** @type {EXPECTED_ANY[]} */ (ast.body);
			const objectTarget = body[0].expression.left;
			expect(objectTarget.type).toBe("ObjectPattern");
			expect(objectTarget.properties[2].type).toBe("RestElement");
			expect(objectTarget.properties[1].value.elements[0].type).toBe(
				"AssignmentPattern"
			);
			const arrayTarget = body[1].expression.left;
			expect(arrayTarget.type).toBe("ArrayPattern");
			expect(arrayTarget.elements[0].type).toBe("MemberExpression");
		});

		it("should keep acorn's LVal errors", () => {
			expect(() => parse("a?.b = 1;")).toThrow(
				/Optional chaining cannot appear in left-hand side/
			);
			expect(() => parse("[a += 1] = x;")).toThrow(
				/Only '=' operator can be used for specifying default value/
			);
			expect(() => parse("({ ...{} } = o);")).toThrow(/Unexpected token/);
			expect(() => parse("[...a = 1] = x;")).toThrow(
				/Rest elements cannot have a default value/
			);
			expect(() => parse("({ get g() {} } = o);")).toThrow(
				/Object pattern can't contain getter or setter/
			);
			expect(() =>
				parse("async function f() { let await; }", { sourceType: "module" })
			).toThrow(/Cannot use 'await' as identifier inside an async function/);
			expect(() => parse("let let = 1;")).toThrow(
				/let is disallowed as a lexically bound name/
			);
		});
	});

	// The C0-verdict facade battery for the SoA backend that will replace
	// the object AST (SOA_MIGRATION_PLAN.md phase C).
	const {
		FLAG_OPTIONAL,
		TYPE_CALL_EXPRESSION,
		TYPE_EXPRESSION_STATEMENT,
		TYPE_IDENTIFIER,
		TYPE_MEMBER_EXPRESSION,
		TYPE_PROGRAM
	} = SoaAst;

	/**
	 * Builds columns for `obj.prop(arg);` and returns the store plus ids.
	 * @returns {EXPECTED_ANY} store and node ids
	 */
	const buildCallAst = () => {
		const source = "obj.prop(arg);";
		const ast = new SoaAst(source);
		const obj = ast.allocNode(TYPE_IDENTIFIER, 0, 3);
		const prop = ast.allocNode(TYPE_IDENTIFIER, 4, 8);
		const member = ast.allocNode(TYPE_MEMBER_EXPRESSION, 0, 8);
		ast.kid0[member] = obj;
		ast.kid1[member] = prop;
		const arg = ast.allocNode(TYPE_IDENTIFIER, 9, 12);
		const call = ast.allocNode(TYPE_CALL_EXPRESSION, 0, 13);
		ast.kid0[call] = member;
		ast.setList(call, [arg]);
		const statement = ast.allocNode(TYPE_EXPRESSION_STATEMENT, 0, 14);
		ast.kid0[statement] = call;
		const program = ast.allocNode(TYPE_PROGRAM, 0, 14);
		ast.setList(program, [statement]);
		return { ast, obj, member, call, statement, program };
	};

	describe("SoA column store", () => {
		it("should serve estree-shaped facades from the columns", () => {
			const { ast, program } = buildCallAst();
			const root = /** @type {EXPECTED_ANY} */ (ast.nodeAt(program));
			expect(root.type).toBe("Program");
			const statement = root.body[0];
			expect(statement.type).toBe("ExpressionStatement");
			const call = statement.expression;
			expect(call.type).toBe("CallExpression");
			expect(call.callee.type).toBe("MemberExpression");
			expect(call.callee.object.name).toBe("obj");
			expect(call.callee.property.name).toBe("prop");
			expect(call.arguments).toHaveLength(1);
			expect(call.arguments[0].name).toBe("arg");
			expect(call.start).toBe(0);
			expect(call.end).toBe(13);
			expect(call.range).toEqual([0, 13]);
		});

		it("should keep facade identity and memoization stable", () => {
			const { ast, call, statement } = buildCallAst();
			const statementFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(statement)
			);
			expect(statementFacade.expression).toBe(ast.nodeAt(call));
			expect(statementFacade.expression).toBe(statementFacade.expression);
			const args = statementFacade.expression.arguments;
			expect(statementFacade.expression.arguments).toBe(args);
			const range = statementFacade.range;
			expect(statementFacade.range).toBe(range);
		});

		it("should accept mutation like plain estree nodes", () => {
			const { ast, call } = buildCallAst();
			const callFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(call));
			callFacade.callee = "REPLACED";
			expect(callFacade.callee).toBe("REPLACED");
			callFacade.type = "NewExpression";
			expect(callFacade.type).toBe("NewExpression");
			callFacade.range = [1, 2];
			expect(callFacade.range).toEqual([1, 2]);
		});

		it("should serve flags and null children", () => {
			const { ast, member } = buildCallAst();
			ast.flags[member] |= FLAG_OPTIONAL;
			const memberFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(member));
			expect(memberFacade.optional).toBe(true);
			expect(memberFacade.computed).toBe(false);
			expect(ast.nodeAt(0)).toBeNull();
		});

		it("should keep symbol slots invisible to enumeration and JSON", () => {
			const { ast, call } = buildCallAst();
			const callFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(call));
			// the C0 verdict's documented trade-off: own scalars enumerate,
			// prototype-served children do not (full enumeration is the opt-in
			// defineProperties mode of a later step)
			expect(Object.keys(callFacade)).toEqual([
				"type",
				"start",
				"end",
				"optional"
			]);
			expect(JSON.stringify(callFacade)).toBe(
				'{"type":"CallExpression","start":0,"end":13,"optional":false}'
			);
			// reading a child memoizes into a symbol slot — still not enumerated
			expect(callFacade.callee.type).toBe("MemberExpression");
			expect(Object.keys(callFacade)).toEqual([
				"type",
				"start",
				"end",
				"optional"
			]);
		});

		it("should serve operators, kinds, literals and ternary children", () => {
			const source = "if (a < 1) return this; var x = -n;";
			const ast = new SoaAst(source);
			const a = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 4, 5);
			const one = ast.allocNode(SoaAst.TYPE_LITERAL, 8, 9);
			ast.aux[one] = SoaAst.LITERAL_NUMBER;
			ast.values[one] = 1;
			const test = ast.allocNode(SoaAst.TYPE_BINARY_EXPRESSION, 4, 9);
			ast.kid0[test] = a;
			ast.kid1[test] = one;
			ast.aux[test] = /** @type {number} */ (SoaAst.OPERATOR_IDS.get("<"));
			const thisExpr = ast.allocNode(SoaAst.TYPE_THIS_EXPRESSION, 18, 22);
			const ret = ast.allocNode(SoaAst.TYPE_RETURN_STATEMENT, 11, 23);
			ast.kid0[ret] = thisExpr;
			const ifStmt = ast.allocNode(SoaAst.TYPE_IF_STATEMENT, 0, 23);
			ast.kid0[ifStmt] = test;
			ast.kid1[ifStmt] = ret;
			// alternate stays 0 = null
			const n = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 33, 34);
			const neg = ast.allocNode(SoaAst.TYPE_UNARY_EXPRESSION, 32, 34);
			ast.kid0[neg] = n;
			ast.aux[neg] = /** @type {number} */ (SoaAst.OPERATOR_IDS.get("-"));
			ast.flags[neg] |= SoaAst.FLAG_PREFIX;
			const x = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 28, 29);
			const declarator = ast.allocNode(SoaAst.TYPE_VARIABLE_DECLARATOR, 28, 35);
			ast.kid0[declarator] = x;
			ast.kid1[declarator] = neg;
			const declaration = ast.allocNode(
				SoaAst.TYPE_VARIABLE_DECLARATION,
				24,
				36
			);
			ast.aux[declaration] = 0; // var
			ast.setList(declaration, [declarator]);

			const ifFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(ifStmt));
			expect(ifFacade.type).toBe("IfStatement");
			expect(ifFacade.test.type).toBe("BinaryExpression");
			expect(ifFacade.test.operator).toBe("<");
			expect(ifFacade.test.left.name).toBe("a");
			expect(ifFacade.test.right.value).toBe(1);
			expect(ifFacade.test.right.raw).toBe("1");
			expect(ifFacade.consequent.argument.type).toBe("ThisExpression");
			expect(ifFacade.alternate).toBeNull();
			const declFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(declaration));
			expect(declFacade.kind).toBe("var");
			const declaratorFacade = declFacade.declarations[0];
			expect(declaratorFacade.type).toBe("VariableDeclarator");
			expect(declaratorFacade.id.name).toBe("x");
			expect(declaratorFacade.init.operator).toBe("-");
			expect(declaratorFacade.init.prefix).toBe(true);
			expect(declaratorFacade.init.argument.name).toBe("n");
		});

		it("should serve function, object, pattern and wrapper facades", () => {
			const source = "async function* f({a = 1, ...r}) { yield [x, ...y]; }";
			const ast = new SoaAst(source);
			const fnId = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 16, 17);
			const a = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 19, 20);
			const one = ast.allocNode(SoaAst.TYPE_LITERAL, 23, 24);
			ast.values[one] = 1;
			const defaulted = ast.allocNode(SoaAst.TYPE_ASSIGNMENT_PATTERN, 19, 24);
			ast.kid0[defaulted] = a;
			ast.kid1[defaulted] = one;
			const aProp = ast.allocNode(SoaAst.TYPE_PROPERTY, 19, 24);
			ast.kid0[aProp] = a;
			ast.kid1[aProp] = defaulted;
			ast.flags[aProp] = SoaAst.FLAG_SHORTHAND;
			const r = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 29, 30);
			const rest = ast.allocNode(SoaAst.TYPE_REST_ELEMENT, 26, 30);
			ast.kid0[rest] = r;
			const pattern = ast.allocNode(SoaAst.TYPE_OBJECT_PATTERN, 18, 31);
			ast.setList(pattern, [aProp, rest]);
			const x = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 42, 43);
			const y = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 48, 49);
			const spread = ast.allocNode(SoaAst.TYPE_SPREAD_ELEMENT, 45, 49);
			ast.kid0[spread] = y;
			const array = ast.allocNode(SoaAst.TYPE_ARRAY_EXPRESSION, 41, 50);
			ast.setList(array, [x, spread]);
			const yielded = ast.allocNode(SoaAst.TYPE_YIELD_EXPRESSION, 35, 50);
			ast.kid0[yielded] = array;
			ast.flags[yielded] = 0;
			const yieldStmt = ast.allocNode(SoaAst.TYPE_EXPRESSION_STATEMENT, 35, 51);
			ast.kid0[yieldStmt] = yielded;
			const body = ast.allocNode(SoaAst.TYPE_BLOCK_STATEMENT, 33, 53);
			ast.setList(body, [yieldStmt]);
			const fn = ast.allocNode(SoaAst.TYPE_FUNCTION_DECLARATION, 0, 53);
			ast.kid0[fn] = fnId;
			ast.kid1[fn] = body;
			ast.setList(fn, [pattern]);
			ast.flags[fn] = SoaAst.FLAG_ASYNC | SoaAst.FLAG_GENERATOR;

			const fnFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(fn));
			expect(fnFacade.type).toBe("FunctionDeclaration");
			expect(fnFacade.async).toBe(true);
			expect(fnFacade.generator).toBe(true);
			expect(fnFacade.expression).toBe(false);
			expect(fnFacade.id.name).toBe("f");
			const objectPattern = fnFacade.params[0];
			expect(objectPattern.type).toBe("ObjectPattern");
			const [shorthand, restProp] = objectPattern.properties;
			expect(shorthand.shorthand).toBe(true);
			expect(shorthand.kind).toBe("init");
			expect(shorthand.value.type).toBe("AssignmentPattern");
			expect(shorthand.value.right.value).toBe(1);
			expect(restProp.type).toBe("RestElement");
			expect(restProp.argument.name).toBe("r");
			const yieldedFacade = fnFacade.body.body[0].expression;
			expect(yieldedFacade.type).toBe("YieldExpression");
			expect(yieldedFacade.delegate).toBe(false);
			const arrayFacade = yieldedFacade.argument;
			expect(arrayFacade.elements[0].name).toBe("x");
			expect(arrayFacade.elements[1].type).toBe("SpreadElement");
			expect(arrayFacade.elements[1].argument.name).toBe("y");
		});

		/**
		 * Reads each child once (cold), again (memoized), then writes a
		 * replacement through the setter and reads it back.
		 * @param {EXPECTED_ANY} facade facade under test
		 * @param {string[]} keys child property names
		 */
		const exerciseChildren = (facade, keys) => {
			for (const key of keys) {
				const first = facade[key];
				expect(facade[key]).toBe(first);
				const replacement = { replaced: key };
				facade[key] = replacement;
				expect(facade[key]).toBe(replacement);
			}
		};

		it("should serve loop facades", () => {
			const source = "abcdefghijklmnopqrstuvwxyz";
			const ast = new SoaAst(source);
			/**
			 * @param {number} i offset (single-letter identifier at i)
			 * @returns {number} identifier ref
			 */
			const ident = (i) => ast.allocNode(SoaAst.TYPE_IDENTIFIER, i, i + 1);
			const forStmt = ast.allocNode(SoaAst.TYPE_FOR_STATEMENT, 0, 20);
			ast.kid0[forStmt] = ident(0);
			ast.kid1[forStmt] = ident(1);
			ast.kid2[forStmt] = ident(2);
			ast.aux[forStmt] = ast.allocNode(SoaAst.TYPE_EMPTY_STATEMENT, 3, 4);
			const forFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(forStmt));
			expect(forFacade.type).toBe("ForStatement");
			expect(forFacade.init.name).toBe("a");
			expect(forFacade.test.name).toBe("b");
			expect(forFacade.update.name).toBe("c");
			expect(forFacade.body.type).toBe("EmptyStatement");
			exerciseChildren(forFacade, ["init", "test", "update", "body"]);

			const forIn = ast.allocNode(SoaAst.TYPE_FOR_IN_STATEMENT, 0, 20);
			ast.kid0[forIn] = ident(4);
			ast.kid1[forIn] = ident(5);
			ast.kid2[forIn] = ident(6);
			const forInFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(forIn));
			expect(forInFacade.type).toBe("ForInStatement");
			expect(forInFacade.await).toBeUndefined();
			expect(forInFacade.left.name).toBe("e");
			expect(forInFacade.right.name).toBe("f");
			expect(forInFacade.body.name).toBe("g");
			exerciseChildren(forInFacade, ["left", "right", "body"]);

			const forOf = ast.allocNode(SoaAst.TYPE_FOR_OF_STATEMENT, 0, 20);
			ast.kid0[forOf] = ident(7);
			ast.kid1[forOf] = ident(8);
			ast.kid2[forOf] = ident(9);
			ast.flags[forOf] = SoaAst.FLAG_AWAIT;
			const forOfFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(forOf));
			expect(forOfFacade.type).toBe("ForOfStatement");
			expect(forOfFacade.await).toBe(true);
			expect(forOfFacade.left.name).toBe("h");

			const whileStmt = ast.allocNode(SoaAst.TYPE_WHILE_STATEMENT, 0, 20);
			ast.kid0[whileStmt] = ident(10);
			ast.kid1[whileStmt] = ident(11);
			const whileFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(whileStmt));
			expect(whileFacade.type).toBe("WhileStatement");
			expect(whileFacade.test.name).toBe("k");
			expect(whileFacade.body.name).toBe("l");
			exerciseChildren(whileFacade, ["test", "body"]);

			const doWhile = ast.allocNode(SoaAst.TYPE_DO_WHILE_STATEMENT, 0, 20);
			ast.kid0[doWhile] = ident(12);
			ast.kid1[doWhile] = ident(13);
			const doWhileFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(doWhile));
			expect(doWhileFacade.type).toBe("DoWhileStatement");
			expect(doWhileFacade.body.name).toBe("m");
			expect(doWhileFacade.test.name).toBe("n");
			exerciseChildren(doWhileFacade, ["body", "test"]);
		});

		it("should serve switch, try, label and with facades", () => {
			const source = "abcdefghijklmnopqrstuvwxyz";
			const ast = new SoaAst(source);
			/**
			 * @param {number} i offset (single-letter identifier at i)
			 * @returns {number} identifier ref
			 */
			const ident = (i) => ast.allocNode(SoaAst.TYPE_IDENTIFIER, i, i + 1);
			const caseA = ast.allocNode(SoaAst.TYPE_SWITCH_CASE, 0, 10);
			ast.kid0[caseA] = ident(0);
			ast.setList(caseA, [
				ast.allocNode(SoaAst.TYPE_EMPTY_STATEMENT, 2, 3),
				ast.allocNode(SoaAst.TYPE_DEBUGGER_STATEMENT, 4, 5)
			]);
			const caseFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(caseA));
			expect(caseFacade.type).toBe("SwitchCase");
			expect(caseFacade.test.name).toBe("a");
			expect(
				caseFacade.consequent.map((/** @type {EXPECTED_ANY} */ s) => s.type)
			).toEqual(["EmptyStatement", "DebuggerStatement"]);
			exerciseChildren(caseFacade, ["consequent", "test"]);
			const defaultCase = ast.allocNode(SoaAst.TYPE_SWITCH_CASE, 0, 10);
			expect(
				/** @type {EXPECTED_ANY} */ (ast.nodeAt(defaultCase)).test
			).toBeNull();

			const switchStmt = ast.allocNode(SoaAst.TYPE_SWITCH_STATEMENT, 0, 12);
			ast.kid0[switchStmt] = ident(1);
			ast.setList(switchStmt, [caseA, defaultCase]);
			const switchFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(switchStmt));
			expect(switchFacade.type).toBe("SwitchStatement");
			expect(switchFacade.discriminant.name).toBe("b");
			expect(switchFacade.cases).toHaveLength(2);
			expect(switchFacade.cases[0]).toBe(caseFacade);
			exerciseChildren(switchFacade, ["discriminant", "cases"]);

			const block = ast.allocNode(SoaAst.TYPE_BLOCK_STATEMENT, 0, 2);
			const handlerBody = ast.allocNode(SoaAst.TYPE_BLOCK_STATEMENT, 6, 8);
			const handler = ast.allocNode(SoaAst.TYPE_CATCH_CLAUSE, 3, 8);
			ast.kid0[handler] = ident(4);
			ast.kid1[handler] = handlerBody;
			const finalizer = ast.allocNode(SoaAst.TYPE_BLOCK_STATEMENT, 9, 11);
			const tryStmt = ast.allocNode(SoaAst.TYPE_TRY_STATEMENT, 0, 11);
			ast.kid0[tryStmt] = block;
			ast.kid1[tryStmt] = handler;
			ast.kid2[tryStmt] = finalizer;
			const tryFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(tryStmt));
			expect(tryFacade.type).toBe("TryStatement");
			expect(tryFacade.block.type).toBe("BlockStatement");
			expect(tryFacade.handler.type).toBe("CatchClause");
			expect(tryFacade.handler.param.name).toBe("e");
			expect(tryFacade.handler.body).toBe(ast.nodeAt(handlerBody));
			expect(tryFacade.finalizer.range).toEqual([9, 11]);
			exerciseChildren(tryFacade, ["block", "handler", "finalizer"]);
			exerciseChildren(ast.nodeAt(handler), ["param", "body"]);

			const throwStmt = ast.allocNode(SoaAst.TYPE_THROW_STATEMENT, 0, 8);
			ast.kid0[throwStmt] = ident(6);
			const throwFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(throwStmt));
			expect(throwFacade.type).toBe("ThrowStatement");
			expect(throwFacade.argument.name).toBe("g");

			const breakStmt = ast.allocNode(SoaAst.TYPE_BREAK_STATEMENT, 0, 9);
			ast.kid0[breakStmt] = ident(7);
			const breakFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(breakStmt));
			expect(breakFacade.type).toBe("BreakStatement");
			expect(breakFacade.label.name).toBe("h");
			exerciseChildren(breakFacade, ["label"]);
			const continueStmt = ast.allocNode(SoaAst.TYPE_CONTINUE_STATEMENT, 0, 9);
			const continueFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(continueStmt)
			);
			expect(continueFacade.type).toBe("ContinueStatement");
			expect(continueFacade.label).toBeNull();

			const labeled = ast.allocNode(SoaAst.TYPE_LABELED_STATEMENT, 0, 12);
			ast.kid0[labeled] = breakStmt;
			ast.kid1[labeled] = ident(8);
			const labeledFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(labeled));
			expect(labeledFacade.type).toBe("LabeledStatement");
			expect(labeledFacade.body).toBe(breakFacade);
			expect(labeledFacade.label.name).toBe("i");
			exerciseChildren(labeledFacade, ["body", "label"]);

			const withStmt = ast.allocNode(SoaAst.TYPE_WITH_STATEMENT, 0, 12);
			ast.kid0[withStmt] = ident(9);
			ast.kid1[withStmt] = block;
			const withFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(withStmt));
			expect(withFacade.type).toBe("WithStatement");
			expect(withFacade.object.name).toBe("j");
			expect(withFacade.body.type).toBe("BlockStatement");
			exerciseChildren(withFacade, ["object", "body"]);
		});

		it("should serve template facades from the interleaved span", () => {
			// eslint-disable-next-line no-template-curly-in-string
			const source = "t`a${b}c`";
			const ast = new SoaAst(source);
			const tag = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 0, 1);
			const quasi0 = ast.allocNode(SoaAst.TYPE_TEMPLATE_ELEMENT, 2, 3);
			ast.values[quasi0] = { raw: "a", cooked: "a" };
			const expr = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 5, 6);
			const quasi1 = ast.allocNode(SoaAst.TYPE_TEMPLATE_ELEMENT, 7, 8);
			ast.values[quasi1] = { raw: "c", cooked: "c" };
			ast.flags[quasi1] = SoaAst.FLAG_TAIL;
			const template = ast.allocNode(SoaAst.TYPE_TEMPLATE_LITERAL, 1, 9);
			ast.setList(template, [quasi0, expr, quasi1]);
			const tagged = ast.allocNode(
				SoaAst.TYPE_TAGGED_TEMPLATE_EXPRESSION,
				0,
				9
			);
			ast.kid0[tagged] = tag;
			ast.kid1[tagged] = template;

			const taggedFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(tagged));
			expect(taggedFacade.type).toBe("TaggedTemplateExpression");
			expect(taggedFacade.tag.name).toBe("t");
			const templateFacade = taggedFacade.quasi;
			expect(templateFacade.type).toBe("TemplateLiteral");
			expect(
				templateFacade.expressions.map(
					(/** @type {EXPECTED_ANY} */ e) => e.name
				)
			).toEqual(["b"]);
			expect(
				templateFacade.quasis.map(
					(/** @type {EXPECTED_ANY} */ q) => q.value.cooked
				)
			).toEqual(["a", "c"]);
			expect(templateFacade.quasis[0].tail).toBe(false);
			expect(templateFacade.quasis[1].tail).toBe(true);
			exerciseChildren(taggedFacade, ["tag", "quasi"]);
			exerciseChildren(templateFacade, ["expressions", "quasis"]);

			// substitution-free template: one quasi, no expressions
			const only = ast.allocNode(SoaAst.TYPE_TEMPLATE_ELEMENT, 2, 3);
			ast.values[only] = { raw: "a", cooked: "a" };
			ast.flags[only] = SoaAst.FLAG_TAIL;
			const bare = ast.allocNode(SoaAst.TYPE_TEMPLATE_LITERAL, 1, 9);
			ast.setList(bare, [only]);
			const bareFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(bare));
			expect(bareFacade.expressions).toEqual([]);
			expect(bareFacade.quasis).toHaveLength(1);
		});

		it("should serve class facades", () => {
			const source = "class A extends B { #m() {} static p = c; static { ; } }";
			const ast = new SoaAst(source);
			const classId = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 6, 7);
			const superClass = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 16, 17);
			const privateName = ast.allocNode(SoaAst.TYPE_PRIVATE_IDENTIFIER, 20, 22);
			const methodFn = ast.allocNode(SoaAst.TYPE_FUNCTION_EXPRESSION, 22, 27);
			const method = ast.allocNode(SoaAst.TYPE_METHOD_DEFINITION, 20, 27);
			ast.kid0[method] = privateName;
			ast.kid1[method] = methodFn;
			ast.aux[method] = 4; // "method"
			const fieldKey = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 35, 36);
			const fieldValue = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 39, 40);
			const field = ast.allocNode(SoaAst.TYPE_PROPERTY_DEFINITION, 28, 41);
			ast.kid0[field] = fieldKey;
			ast.kid1[field] = fieldValue;
			ast.flags[field] = SoaAst.FLAG_STATIC;
			const staticBlock = ast.allocNode(SoaAst.TYPE_STATIC_BLOCK, 42, 55);
			ast.setList(staticBlock, [
				ast.allocNode(SoaAst.TYPE_EMPTY_STATEMENT, 51, 52)
			]);
			const classBody = ast.allocNode(SoaAst.TYPE_CLASS_BODY, 18, 56);
			ast.setList(classBody, [method, field, staticBlock]);
			const classDecl = ast.allocNode(SoaAst.TYPE_CLASS_DECLARATION, 0, 56);
			ast.kid0[classDecl] = classId;
			ast.kid1[classDecl] = superClass;
			ast.kid2[classDecl] = classBody;

			const classFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(classDecl));
			expect(classFacade.type).toBe("ClassDeclaration");
			expect(classFacade.id.name).toBe("A");
			expect(classFacade.superClass.name).toBe("B");
			const bodyFacade = classFacade.body;
			expect(bodyFacade.type).toBe("ClassBody");
			const [methodFacade, fieldFacade, staticBlockFacade] = bodyFacade.body;
			expect(methodFacade.type).toBe("MethodDefinition");
			expect(methodFacade.static).toBe(false);
			expect(methodFacade.computed).toBe(false);
			expect(methodFacade.kind).toBe("method");
			expect(methodFacade.key.type).toBe("PrivateIdentifier");
			expect(methodFacade.key.name).toBe("m");
			expect(methodFacade.value.type).toBe("FunctionExpression");
			expect(fieldFacade.type).toBe("PropertyDefinition");
			expect(fieldFacade.static).toBe(true);
			expect(fieldFacade.key.name).toBe("p");
			expect(fieldFacade.value.name).toBe("c");
			expect(staticBlockFacade.type).toBe("StaticBlock");
			expect(staticBlockFacade.body[0].type).toBe("EmptyStatement");
			exerciseChildren(classFacade, ["id", "superClass", "body"]);
			exerciseChildren(methodFacade, ["key", "value"]);
			exerciseChildren(fieldFacade, ["key", "value"]);
			exerciseChildren(staticBlockFacade, ["body"]);

			// escaped private names land in the side list
			const escaped = ast.allocNode(SoaAst.TYPE_PRIVATE_IDENTIFIER, 20, 22);
			ast.values[escaped] = "esc";
			expect(/** @type {EXPECTED_ANY} */ (ast.nodeAt(escaped)).name).toBe(
				"esc"
			);

			const superNode = ast.allocNode(SoaAst.TYPE_SUPER, 0, 5);
			expect(/** @type {EXPECTED_ANY} */ (ast.nodeAt(superNode)).type).toBe(
				"Super"
			);
			const meta = ast.allocNode(SoaAst.TYPE_META_PROPERTY, 0, 10);
			ast.kid0[meta] = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 6, 7);
			ast.kid1[meta] = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 16, 17);
			const metaFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(meta));
			expect(metaFacade.type).toBe("MetaProperty");
			expect(metaFacade.meta.name).toBe("A");
			expect(metaFacade.property.name).toBe("B");
			exerciseChildren(metaFacade, ["meta", "property"]);
		});

		it("should serve import and export facades", () => {
			const source = 'import d, { a as b } from "m";';
			const ast = new SoaAst(source);
			const defaultLocal = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 7, 8);
			const defaultSpecifier = ast.allocNode(
				SoaAst.TYPE_IMPORT_DEFAULT_SPECIFIER,
				7,
				8
			);
			ast.kid0[defaultSpecifier] = defaultLocal;
			const imported = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 12, 13);
			const local = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 17, 18);
			const specifier = ast.allocNode(SoaAst.TYPE_IMPORT_SPECIFIER, 12, 18);
			ast.kid0[specifier] = imported;
			ast.kid1[specifier] = local;
			const sourceLiteral = ast.allocNode(SoaAst.TYPE_LITERAL, 26, 29);
			ast.values[sourceLiteral] = "m";
			const importDecl = ast.allocNode(SoaAst.TYPE_IMPORT_DECLARATION, 0, 30);
			ast.kid0[importDecl] = sourceLiteral;
			ast.flags[importDecl] = SoaAst.FLAG_ES2025;
			ast.setList(importDecl, [defaultSpecifier, specifier]);

			const importFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(importDecl));
			expect(importFacade.type).toBe("ImportDeclaration");
			expect(importFacade.attributes).toEqual([]);
			expect(importFacade.source.value).toBe("m");
			const [defaultFacade, specifierFacade] = importFacade.specifiers;
			expect(defaultFacade.type).toBe("ImportDefaultSpecifier");
			expect(defaultFacade.local.name).toBe("d");
			expect(specifierFacade.type).toBe("ImportSpecifier");
			expect(specifierFacade.imported.name).toBe("a");
			expect(specifierFacade.local.name).toBe("b");
			exerciseChildren(importFacade, ["specifiers", "source"]);
			exerciseChildren(specifierFacade, ["imported", "local"]);
			exerciseChildren(defaultFacade, ["local"]);

			// pre-ES2025 declarations carry no `attributes` key at all
			const oldImport = ast.allocNode(SoaAst.TYPE_IMPORT_DECLARATION, 0, 30);
			expect(
				"attributes" in /** @type {EXPECTED_ANY} */ (ast.nodeAt(oldImport))
			).toBe(false);

			const namespaceSpecifier = ast.allocNode(
				SoaAst.TYPE_IMPORT_NAMESPACE_SPECIFIER,
				7,
				8
			);
			ast.kid0[namespaceSpecifier] = defaultLocal;
			const namespaceFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(namespaceSpecifier)
			);
			expect(namespaceFacade.type).toBe("ImportNamespaceSpecifier");
			expect(namespaceFacade.local.name).toBe("d");

			const attrKey = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 7, 8);
			const attrValue = ast.allocNode(SoaAst.TYPE_LITERAL, 26, 29);
			ast.values[attrValue] = "m";
			const attribute = ast.allocNode(SoaAst.TYPE_IMPORT_ATTRIBUTE, 7, 29);
			ast.kid0[attribute] = attrKey;
			ast.kid1[attribute] = attrValue;
			const attributeFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(attribute)
			);
			expect(attributeFacade.type).toBe("ImportAttribute");
			expect(attributeFacade.key.name).toBe("d");
			expect(attributeFacade.value.value).toBe("m");
			exerciseChildren(attributeFacade, ["key", "value"]);
			const withAttributes = ast.allocNode(
				SoaAst.TYPE_IMPORT_DECLARATION,
				0,
				30
			);
			ast.flags[withAttributes] = SoaAst.FLAG_ES2025;
			ast.values[withAttributes] = [attributeFacade];
			expect(
				/** @type {EXPECTED_ANY} */ (ast.nodeAt(withAttributes)).attributes
			).toEqual([attributeFacade]);

			const importExpr = ast.allocNode(SoaAst.TYPE_IMPORT_EXPRESSION, 0, 30);
			ast.kid0[importExpr] = sourceLiteral;
			ast.flags[importExpr] = SoaAst.FLAG_ES2025;
			const importExprFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(importExpr)
			);
			expect(importExprFacade.type).toBe("ImportExpression");
			expect(importExprFacade.source.value).toBe("m");
			expect(importExprFacade.options).toBeNull();
			exerciseChildren(importExprFacade, ["source"]);
			const oldImportExpr = ast.allocNode(SoaAst.TYPE_IMPORT_EXPRESSION, 0, 30);
			expect(
				"options" in /** @type {EXPECTED_ANY} */ (ast.nodeAt(oldImportExpr))
			).toBe(false);

			const exportLocal = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 12, 13);
			const exported = ast.allocNode(SoaAst.TYPE_IDENTIFIER, 17, 18);
			const exportSpecifier = ast.allocNode(
				SoaAst.TYPE_EXPORT_SPECIFIER,
				12,
				18
			);
			ast.kid0[exportSpecifier] = exportLocal;
			ast.kid1[exportSpecifier] = exported;
			const namedExport = ast.allocNode(
				SoaAst.TYPE_EXPORT_NAMED_DECLARATION,
				0,
				30
			);
			ast.kid1[namedExport] = sourceLiteral;
			ast.flags[namedExport] = SoaAst.FLAG_ES2025;
			ast.setList(namedExport, [exportSpecifier]);
			const namedFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(namedExport));
			expect(namedFacade.type).toBe("ExportNamedDeclaration");
			expect(namedFacade.declaration).toBeNull();
			expect(namedFacade.attributes).toEqual([]);
			expect(namedFacade.source.value).toBe("m");
			const exportSpecifierFacade = namedFacade.specifiers[0];
			expect(exportSpecifierFacade.type).toBe("ExportSpecifier");
			expect(exportSpecifierFacade.local.name).toBe("a");
			expect(exportSpecifierFacade.exported.name).toBe("b");
			exerciseChildren(namedFacade, ["declaration", "specifiers", "source"]);
			exerciseChildren(exportSpecifierFacade, ["local", "exported"]);

			const defaultExport = ast.allocNode(
				SoaAst.TYPE_EXPORT_DEFAULT_DECLARATION,
				0,
				30
			);
			ast.kid0[defaultExport] = exportLocal;
			const defaultExportFacade = /** @type {EXPECTED_ANY} */ (
				ast.nodeAt(defaultExport)
			);
			expect(defaultExportFacade.type).toBe("ExportDefaultDeclaration");
			expect(defaultExportFacade.declaration.name).toBe("a");
			exerciseChildren(defaultExportFacade, ["declaration"]);

			const allExport = ast.allocNode(
				SoaAst.TYPE_EXPORT_ALL_DECLARATION,
				0,
				30
			);
			ast.kid0[allExport] = exported;
			ast.kid1[allExport] = sourceLiteral;
			ast.flags[allExport] = SoaAst.FLAG_ES2025;
			const allFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(allExport));
			expect(allFacade.type).toBe("ExportAllDeclaration");
			expect(allFacade.exported.name).toBe("b");
			expect(allFacade.source.value).toBe("m");
			expect(allFacade.attributes).toEqual([]);
			exerciseChildren(allFacade, ["exported", "source"]);
		});

		it("should grow columns and the flat buffer beyond their initial capacity", () => {
			const ast = new SoaAst("x");
			/** @type {number[]} */
			const refs = [];
			for (let i = 0; i < 5000; i++) {
				refs.push(ast.allocNode(TYPE_IDENTIFIER, i, i + 1));
			}
			const program = ast.allocNode(TYPE_PROGRAM, 0, 5000);
			ast.setList(program, refs);
			expect(ast.count).toBe(5002);
			expect(ast.types[refs[4999]]).toBe(TYPE_IDENTIFIER);
			expect(ast.listLens[program]).toBe(5000);
			const root = /** @type {EXPECTED_ANY} */ (ast.nodeAt(program));
			expect(root.body).toHaveLength(5000);
			expect(root.body[4999].start).toBe(4999);
		});
	});

	// The SoA-migration correctness gate: lazy-mode output must be
	// indistinguishable from plain acorn on real-world sources.
	describe("corpus equivalence", () => {
		const fs = require("fs");
		const path = require("path");
		const acorn = require("acorn");
		const { WebpackParser } = require("../lib/javascript/syntax");

		/**
		 * @param {string} pkg package name
		 * @param {string} rel path within the package
		 * @returns {string} file contents
		 */
		const readPkgFile = (pkg, rel) =>
			fs.readFileSync(
				path.join(path.dirname(require.resolve(`${pkg}/package.json`)), rel),
				"utf8"
			);

		/** @type {[name: string, sourceType: "script" | "module", read: () => string][]} */
		const corpus = [
			[
				"typescript.js",
				"script",
				() =>
					fs.readFileSync(
						require.resolve("typescript/lib/typescript.js"),
						"utf8"
					)
			],
			// three's `exports` map hides package.json — resolve the main entry
			// (build/three.cjs) and read its siblings
			[
				"three.module.js",
				"module",
				() =>
					fs.readFileSync(
						path.join(
							path.dirname(require.resolve("three")),
							"three.module.js"
						),
						"utf8"
					)
			],
			[
				"three.module.min.js",
				"module",
				() =>
					fs.readFileSync(
						path.join(
							path.dirname(require.resolve("three")),
							"three.module.min.js"
						),
						"utf8"
					)
			],
			[
				"react.development.js",
				"script",
				() => readPkgFile("react", "cjs/react.development.js")
			],
			[
				"react-dom.development.js",
				"script",
				() => readPkgFile("react-dom", "cjs/react-dom.development.js")
			],
			["lodash.js", "script", () => readPkgFile("lodash", "lodash.js")],
			["lodash-es", "module", () => readPkgFile("lodash-es", "lodash.js")]
		];

		// lazy nodes serve `range` from a prototype getter equal to
		// [start, end] by construction and never serve `loc`
		const SKIPPED_KEYS = new Set(["range", "loc"]);

		/**
		 * Iterative deep compare (recursion would overflow on minified inputs);
		 * throws on the first mismatch since a jest matcher per node would
		 * dominate the runtime on multi-million-node fixtures.
		 * @param {unknown} actual lazy-mode AST root
		 * @param {unknown} expected acorn AST root
		 */
		const expectSameAst = (actual, expected) => {
			/** @type {[unknown, unknown, string][]} */
			const stack = [[actual, expected, "Program"]];
			/** @type {{ type: string, start: number }} */
			let ctx = /** @type {EXPECTED_ANY} */ (expected);
			while (stack.length > 0) {
				const [a, e, key] = /** @type {[unknown, unknown, string]} */ (
					stack.pop()
				);
				const at = `${ctx.type}@${ctx.start} .${key}`;
				if (e === null || typeof e !== "object") {
					if (!Object.is(a, e)) {
						throw new Error(`${at}: expected ${String(e)}, got ${String(a)}`);
					}
					continue;
				}
				if (e instanceof RegExp) {
					if (!(a instanceof RegExp) || String(a) !== String(e)) {
						throw new Error(`${at}: expected ${e}, got ${String(a)}`);
					}
					continue;
				}
				if (Array.isArray(e)) {
					if (!Array.isArray(a) || a.length !== e.length) {
						throw new Error(
							`${at}: expected array of ${e.length}, got ${
								Array.isArray(a) ? `array of ${a.length}` : typeof a
							}`
						);
					}
					for (let i = e.length - 1; i >= 0; i--) stack.push([a[i], e[i], key]);
					continue;
				}
				if (typeof a !== "object" || a === null || Array.isArray(a)) {
					throw new Error(`${at}: expected object, got ${String(a)}`);
				}
				const eObj = /** @type {Record<string, unknown>} */ (e);
				const aObj = /** @type {Record<string, unknown>} */ (a);
				if (typeof eObj.type === "string") {
					ctx = /** @type {{ type: string, start: number }} */ (e);
				}
				let eCount = 0;
				for (const k in eObj) {
					if (SKIPPED_KEYS.has(k)) continue;
					eCount++;
					if (!Object.prototype.hasOwnProperty.call(aObj, k)) {
						throw new Error(`${at}: missing key ${k}`);
					}
					stack.push([aObj[k], eObj[k], k]);
				}
				let aCount = 0;
				for (const k in aObj) {
					if (!SKIPPED_KEYS.has(k)) aCount++;
				}
				if (aCount !== eCount) {
					throw new Error(
						`${at}: extra keys ${Object.keys(aObj)
							.filter(
								(k) =>
									!SKIPPED_KEYS.has(k) &&
									!Object.prototype.hasOwnProperty.call(eObj, k)
							)
							.join(", ")}`
					);
				}
			}
		};

		for (const [name, sourceType, read] of corpus) {
			it(`should produce acorn's AST for ${name}`, () => {
				const code = read();
				/** @type {import("acorn").Comment[]} */
				const expectedComments = [];
				const expected = acorn.parse(code, {
					ecmaVersion: "latest",
					sourceType,
					allowHashBang: true,
					allowReturnOutsideFunction: sourceType === "script",
					onComment: expectedComments
				});
				/** @type {import("../lib/javascript/JavascriptParser").Comment[]} */
				const actualComments = [];
				const actual = WebpackParser.parse(
					code,
					/** @type {import("acorn").Options} */ (
						/** @type {unknown} */ ({
							ecmaVersion: "latest",
							sourceType,
							allowHashBang: true,
							allowReturnOutsideFunction: sourceType === "script",
							lazyNodes: true,
							lazyComments: actualComments
						})
					)
				);
				expectSameAst(actual, expected);
				expect(actualComments).toHaveLength(expectedComments.length);
				for (let i = 0; i < expectedComments.length; i++) {
					const e = expectedComments[i];
					const a = actualComments[i];
					if (
						a.type !== e.type ||
						a.start !== e.start ||
						a.end !== e.end ||
						a.value !== e.value
					) {
						throw new Error(`comment ${i} (${e.type}@${e.start}) differs`);
					}
				}
			}, 180000);
		}
	});
});
