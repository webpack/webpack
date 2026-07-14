"use strict";

// cspell:ignore ypeof averyvery ahri aafom

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

	describe("automatic semicolon insertion", () => {
		it("should insert semicolons across line breaks and at eof", () => {
			expect([...parse("x").semicolons]).toHaveLength(1);
			expect([...parse("a\nb").semicolons]).toHaveLength(2);
			expect([...parse("x;\ny;").semicolons]).toHaveLength(0);
			expect(
				[...parse("function f() { return\n5 }").semicolons].length
			).toBeGreaterThan(0);
		});

		it("should parse numbers and insert semicolons without ranges", () => {
			const { ast, semicolons } = parse("var x = 1.5\nvar y = 0", {
				ranges: false
			});
			expect(ast.body).toHaveLength(2);
			expect([...semicolons]).toHaveLength(2);
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
			const {
				SourcePositions,
				WebpackParser
			} = require("../lib/javascript/syntax");

			const source = "= .";
			const parser = new WebpackParser(
				/** @type {EXPECTED_ANY} */ ({
					ecmaVersion: "latest",
					lazySourcePositions: new SourcePositions(source)
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
});
