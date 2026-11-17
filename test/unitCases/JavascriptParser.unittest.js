"use strict";

const { fixture } = require("../helpers/fixture");

/* eslint-disable no-unused-expressions, no-unassigned-vars, func-names */

// cspell:ignore fghsub notry fghsub notry notry this's ijksub this's ijksub fghsub fghsub notry ijksub ijksub strrring strrring strr strrring strrring strr Sstrrringy strone stronetwo stronetwothree stronetwo stronetwothree stronetwothreefour onetwo onetwo twothree twothree twothree threefour onetwo onetwo threefour threefour fourfive startstrmid igmy igmyi igmya
const BasicEvaluatedExpression = require("../../lib/javascript/BasicEvaluatedExpression");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");
const { estree, parseEstree } = require("../helpers/javascriptParse");

/** @typedef {import("../../lib/javascript/syntax-parser").CollectedComment} CollectedComment */

/**
 * Parse into a syntax tree and build its ESTree objects, as a loader hands a
 * program another parser built, collecting comments as it goes.
 * @param {string} code source code
 * @param {"module" | "script"} sourceType goal symbol
 * @returns {{ ast: import("estree").Program, comments: CollectedComment[] }} the program and its comments
 */
const parseWithComments = (code, sourceType) =>
	parseEstree(code, { sourceType, ranges: true, comments: true });

describe("JavascriptParser", () => {
	const testCases = /** @type {EXPECTED_ANY} */ ({
		"call ident": [
			fixture("javascript", "javascript-parser-should-parse-call-ident"),
			{
				abc: ["test"]
			}
		],
		"call member": [
			fixture("javascript", "javascript-parser-should-parse-call-member"),
			{
				cdeabc: ["membertest"]
			}
		],
		"call member using bracket notation": [
			fixture("javascript", "javascript-parser-should-parse-call-member-using-bracket-notation"),
			{
				cdeabc: ["membertest"]
			}
		],
		"call inner member": [
			fixture("javascript", "javascript-parser-should-parse-call-inner-member"),
			{
				cdedddabc: ["inner"]
			}
		],
		"call inner member using bracket notation": [
			fixture("javascript", "javascript-parser-should-parse-call-inner-member-using-bracket-notation"),
			{
				cdedddabc: ["inner"]
			}
		],
		expression: [
			fixture("javascript", "javascript-parser-should-parse-expression"),
			{
				fgh: [""]
			}
		],
		"expression sub": [
			fixture("javascript", "javascript-parser-should-parse-expression-sub"),
			{
				fghsub: ["notry"]
			}
		],
		"member expression": [
			fixture("javascript", "javascript-parser-should-parse-member-expression"),
			{
				expressions: ["memberExpr", "memberExpr"]
			}
		],
		"in function definition": [
			fixture("javascript", "javascript-parser-should-parse-in-function-definition"),
			{}
		],
		"const definition": [
			fixture("javascript", "javascript-parser-should-parse-const-definition"),
			{}
		],
		"var definition": [
			fixture("javascript", "javascript-parser-should-parse-var-definition"),
			{}
		],
		"function definition": [
			fixture("javascript", "javascript-parser-should-parse-function-definition"),
			{}
		],
		"class definition": [
			fixture("javascript", "javascript-parser-should-parse-class-definition"),
			{
				abc: ["cde", "fgh"],
				fgh: ["memberExpr"]
			}
		],
		"in try": [
			fixture("javascript", "javascript-parser-should-parse-in-try"),
			{
				fghsub: ["try", "notry", "notry"],
				fgh: ["test", "test ttt", "test err"]
			}
		],
		"renaming with const": [
			fixture("javascript", "javascript-parser-should-parse-renaming-with-const"),
			{
				abc: ["test"]
			}
		],
		"renaming with var": [
			fixture("javascript", "javascript-parser-should-parse-renaming-with-var"),
			{
				abc: ["test"]
			}
		],
		"renaming with assignment": [
			fixture("javascript", "javascript-parser-should-parse-renaming-with-assignment"),
			{
				abc: ["test"]
			}
		],
		"renaming with IIFE": [
			fixture("javascript", "javascript-parser-should-parse-renaming-with-iife"),
			{
				abc: ["test"]
			}
		],
		"renaming arguments with IIFE (called)": [
			fixture("javascript", "javascript-parser-should-parse-renaming-arguments-with-iife-called"),
			{
				abc: ["test"],
				fgh: [""]
			}
		],
		"renaming this's properties with IIFE (called)": [
			fixture("javascript", "javascript-parser-should-parse-renaming-this-s-properties-with-iife-called"),
			{
				ijksub: ["test"]
			}
		],
		"renaming this's properties with nested IIFE (called)": [
			fixture("javascript", "javascript-parser-should-parse-renaming-this-s-properties-with-nested-iife-called"),
			{
				ijksub: ["test"]
			}
		],
		"new Foo(...)": [
			fixture("javascript", "javascript-parser-should-parse-new-foo"),
			{
				xyz: ["membertest"]
			}
		],
		"spread calls/literals": [
			fixture("javascript", "javascript-parser-should-parse-spread-calls-literals"),
			{
				abc: ["xyz"],
				fgh: ["xyz"]
			}
		]
	});


	for (const name of Object.keys(testCases)) {
		it(`should parse ${name}`, () => {
			const source = /** @type {Record<string, EXPECTED_ANY[]>} */ (testCases)[
				name
			][0];
			const state = /** @type {Record<string, EXPECTED_ANY[]>} */ (testCases)[
				name
			][1];

			const testParser = new JavascriptParser(
				/** @type {"auto"} */ (/** @type {unknown} */ ({}))
			);
			testParser.hooks.canRename
				.for("abc")
				.tap("JavascriptParserTest", (_expr) => true);
			testParser.hooks.canRename
				.for("ijk")
				.tap("JavascriptParserTest", (_expr) => true);
			testParser.hooks.call.for("abc").tap("JavascriptParserTest", (expr) => {
				if (!testParser.state.abc) testParser.state.abc = [];
				testParser.state.abc.push(
					testParser.parseString(
						/** @type {import("estree").Expression} */ (expr.arguments[0])
					)
				);
				return true;
			});
			testParser.hooks.call
				.for("cde.abc")
				.tap("JavascriptParserTest", (expr) => {
					if (!testParser.state.cdeabc) testParser.state.cdeabc = [];
					testParser.state.cdeabc.push(
						testParser.parseString(
							/** @type {import("estree").Expression} */ (expr.arguments[0])
						)
					);
					return true;
				});
			testParser.hooks.call
				.for("cde.ddd.abc")
				.tap("JavascriptParserTest", (expr) => {
					if (!testParser.state.cdedddabc) testParser.state.cdedddabc = [];
					testParser.state.cdedddabc.push(
						testParser.parseString(
							/** @type {import("estree").Expression} */ (expr.arguments[0])
						)
					);
					return true;
				});
			testParser.hooks.expression
				.for("fgh")
				.tap("JavascriptParserTest", (_expr) => {
					if (!testParser.state.fgh) testParser.state.fgh = [];
					testParser.state.fgh.push(
						[...testParser.scope.definitions.asSet()].join(" ")
					);
					return true;
				});
			testParser.hooks.expression
				.for("fgh.sub")
				.tap("JavascriptParserTest", (_expr) => {
					if (!testParser.state.fghsub) testParser.state.fghsub = [];
					testParser.state.fghsub.push(
						testParser.scope.inTry ? "try" : "notry"
					);
					return true;
				});
			testParser.hooks.expression
				.for("ijk.sub")
				.tap("JavascriptParserTest", (_expr) => {
					if (!testParser.state.ijksub) testParser.state.ijksub = [];
					testParser.state.ijksub.push("test");
					return true;
				});
			testParser.hooks.expression
				.for("memberExpr")
				.tap("JavascriptParserTest", (expr) => {
					if (!testParser.state.expressions) testParser.state.expressions = [];
					testParser.state.expressions.push(
						/** @type {import("estree").Identifier} */ (expr).name
					);
					return true;
				});
			testParser.hooks.new.for("xyz").tap("JavascriptParserTest", (expr) => {
				if (!testParser.state.xyz) testParser.state.xyz = [];
				testParser.state.xyz.push(
					testParser.parseString(
						/** @type {import("estree").Expression} */ (expr.arguments[0])
					)
				);
				return true;
			});
			const actual = testParser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(typeof actual).toBe("object");
			expect(actual).toEqual(state);
		});
	}

	it("should parse comments", () => {
		const source = fixture("javascript", "javascript-parser-should-parse-comments-source");
		const state = [
			{
				type: "Line",
				value: "comment1"
			},
			{
				type: "Block",
				value: "comment2"
			}
		];

		const testParser = new JavascriptParser(
			/** @type {"auto"} */ (/** @type {unknown} */ ({}))
		);

		testParser.hooks.program.tap("JavascriptParserTest", (ast, comments) => {
			if (!testParser.state.comments) testParser.state.comments = comments;
			return true;
		});

		const actual = testParser.parse(
			source,
			/** @type {import("../../lib/module/Parser").ParserState} */ (
				/** @type {unknown} */ ({})
			)
		);
		expect(typeof actual).toBe("object");
		expect(typeof actual.comments).toBe("object");
		for (const [index, element] of actual.comments.entries()) {
			expect(typeof element.type).toBe("string");
			expect(typeof element.value).toBe("string");
			expect(element.type).toBe(state[index].type);
			expect(element.value).toBe(state[index].value);
		}
	});

	describe("expression evaluation", () => {
		/**
		 * @param {string} source a `test(<expression>);` statement
		 * @returns {import("../../lib/javascript/BasicEvaluatedExpression")} the evaluated expression
		 */
		function evaluateInParser(source) {
			const parser = new JavascriptParser();
			parser.hooks.call.for("test").tap("JavascriptParserTest", (expr) => {
				parser.state.result = parser.evaluateExpression(expr.arguments[0]);
			});
			parser.hooks.evaluateIdentifier
				.for("aString")
				.tap("JavascriptParserTest", (expr) =>
					new BasicEvaluatedExpression()
						.setString("aString")
						.setRange(
							/** @type {import("../../lib/javascript/JavascriptParser").Range} */ (
								expr.range
							)
						)
				);
			parser.hooks.evaluateIdentifier
				.for("b.Number")
				.tap("JavascriptParserTest", (expr) =>
					new BasicEvaluatedExpression()
						.setNumber(123)
						.setRange(
							/** @type {import("../../lib/javascript/JavascriptParser").Range} */ (
								expr.range
							)
						)
				);
			return parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			).result;
		}

		const statements = fixture(
			"javascript",
			"javascript-parser-expression-evaluation"
		).split("\n");

		for (const statement of statements) {
			const key = statement.slice(5, -2);
			/**
			 * @param {import("../../lib/javascript/BasicEvaluatedExpression")} evalExpr eval expr
			 * @returns {string} result
			 */
			function evalExprToString(evalExpr) {
				if (!evalExpr) {
					return "null";
				}
				const result = [];
				if (evalExpr.isString()) result.push(`string=${evalExpr.string}`);
				if (evalExpr.isNumber()) result.push(`number=${evalExpr.number}`);
				if (evalExpr.isBigInt()) result.push(`bigint=${evalExpr.bigint}`);
				if (evalExpr.isBoolean()) result.push(`bool=${evalExpr.bool}`);
				if (evalExpr.isRegExp()) result.push(`regExp=${evalExpr.regExp}`);
				if (evalExpr.isConditional()) {
					result.push(
						`options=[${/** @type {import("../../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.options).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isArray()) {
					result.push(
						`items=[${/** @type {import("../../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.items).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isConstArray()) {
					result.push(
						`array=[${/** @type {(string | number | boolean | null | RegExp | bigint)[]} */ (evalExpr.array).join("],[")}]`
					);
				}
				if (evalExpr.isTemplateString()) {
					result.push(
						`template=[${/** @type {import("../../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.quasis).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isWrapped()) {
					result.push(
						`wrapped=[${evalExprToString(/** @type {import("../../lib/javascript/BasicEvaluatedExpression")} */ (evalExpr.prefix))}]+[${evalExprToString(
							/** @type {import("../../lib/javascript/BasicEvaluatedExpression")} */ (
								evalExpr.postfix
							)
						)}]`
					);
				}
				if (evalExpr.range) {
					const start = evalExpr.range[0] - 5;
					const end = evalExpr.range[1] - 5;
					return (
						key.slice(start, end) +
						(result.length > 0 ? ` ${result.join(" ")}` : "")
					);
				}
				return result.join(" ");
			}

			it(`should eval ${key}`, () => {
				expect(evalExprToString(evaluateInParser(statement))).toMatchSnapshot();
			});
		}

		it("should not warn when a const operation throws at runtime", () => {
			const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
			try {
				for (const statement of fixture(
					"javascript",
					"javascript-parser-const-operations-that-throw"
				).split("\n")) {
					evaluateInParser(statement);
				}
				expect(spy).not.toHaveBeenCalled();
			} finally {
				spy.mockRestore();
			}
		});
	});

	describe("async/await support", () => {
		describe("should accept", () => {
			const cases = {
				"async function": fixture("javascript", "javascript-parser-async-await-support-should-accept-async-function"),
				"async arrow function": fixture("javascript", "javascript-parser-async-await-support-should-accept-async-arrow-function"),
				"await expression": fixture("javascript", "javascript-parser-async-await-support-should-accept-await-expression"),
				"await iteration": fixture("javascript", "javascript-parser-async-await-support-should-accept-await-iteration")
			};
			const parser = new JavascriptParser();
			for (const name of Object.keys(cases)) {
				const expr = /** @type {Record<string, string>} */ (cases)[name];

				it(name, () => {
					const actual = parser.parse(
						expr,
						/** @type {import("../../lib/module/Parser").ParserState} */ (
							/** @type {unknown} */ ({})
						)
					);
					expect(typeof actual).toBe("object");
				});
			}
		});

		describe("should parse await", () => {
			const cases = {
				require: [
					"async function x() { await require('y'); }",
					{
						param: "y"
					}
				],
				import: [
					"async function x() { const y = await import('z'); }",
					{
						param: "z"
					}
				]
			};

			const parser = new JavascriptParser();
			parser.hooks.call.for("require").tap("JavascriptParserTest", (expr) => {
				const param = parser.evaluateExpression(expr.arguments[0]);
				parser.state.param = param.string;
			});
			parser.hooks.importCall.tap("JavascriptParserTest", (expr) => {
				const param = parser.evaluateExpression(expr.source);
				parser.state.param = param.string;
			});

			for (const name of Object.keys(cases)) {
				it(name, () => {
					const actual = parser.parse(
						/** @type {Record<string, EXPECTED_ANY[]>} */ (cases)[name][0],
						/** @type {import("../../lib/module/Parser").ParserState} */ (
							/** @type {unknown} */ ({})
						)
					);
					expect(actual).toEqual(
						/** @type {Record<string, EXPECTED_ANY[]>} */ (cases)[name][1]
					);
				});
			}
		});
	});

	describe("object rest/spread support", () => {
		describe("should accept", () => {
			const cases = {
				"object spread": "({...obj})",
				"object rest": "({...obj} = foo)"
			};
			for (const name of Object.keys(cases)) {
				const expr = /** @type {Record<string, string>} */ (cases)[name];

				it(name, () => {
					const actual = estree(expr, { ecmaVersion: "latest" });
					expect(typeof actual).toBe("object");
				});
			}
		});

		it("should collect definitions from identifiers introduced in object patterns", () => {
			/** @type {EXPECTED_ANY} */
			let definitions;

			const parser = new JavascriptParser();

			parser.hooks.statement.tap("JavascriptParserTest", (_expr) => {
				definitions = parser.scope.definitions;
				return true;
			});

			parser.parse(
				fixture("javascript", "javascript-parser-object-rest-spread-support-should-collect-definitions-from"),
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);

			expect(definitions.has("a")).toBe(true);
			expect(definitions.has("rest")).toBe(true);
		});
	});

	describe("inBlockScope", () => {
		it("should isolate definitions and propagate termination only on executed paths", () => {
			const parser = new JavascriptParser();
			expect.assertions(8);

			parser.hooks.program.tap("JavascriptParserTest", () => {
				const outerScope = parser.scope;
				outerScope.inShorthand = true;
				parser.inBlockScope(() => {
					expect(parser.scope).not.toBe(outerScope);
					expect(parser.scope.inShorthand).toBe(false);
					parser.defineVariable("inner");
					expect(parser.scope.definitions.has("inner")).toBe(true);
					parser.scope.terminated = 1;
				});
				expect(parser.scope).toBe(outerScope);
				expect(outerScope.definitions.has("inner")).toBe(false);
				expect(outerScope.terminated).toBeUndefined();

				parser.inBlockScope(() => {
					parser.scope.terminated = 2;
				}, true);
				expect(parser.scope).toBe(outerScope);
				expect(outerScope.terminated).toBe(2);
				outerScope.inShorthand = false;
				outerScope.terminated = undefined;
			});

			parser.parse(
				fixture("javascript", "javascript-parser-in-block-scope-should-isolate-definitions-and-propagate"),
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
		});
	});

	describe("parse calculated string", () => {
		describe("should work", () => {
			const cases = {
				123: {
					code: "123",
					result: {
						code: false,
						conditional: false,
						range: [0, 3],
						value: "123"
					}
				},
				"'test'": {
					code: "'test'",
					result: {
						code: false,
						conditional: false,
						range: [0, 6],
						value: "test"
					}
				},
				"'test' + 'test'": {
					code: "'test' + 'test'",
					result: {
						code: false,
						conditional: false,
						range: [0, 15],
						value: "testtest"
					}
				},
				"myVar + 'test'": {
					code: "myVar + 'test'",
					result: {
						code: true,
						conditional: false,
						range: undefined,
						value: ""
					}
				},
				"'test' + myVar": {
					code: "'test' + myVar",
					result: {
						code: true,
						conditional: false,
						range: [0, 6],
						value: "test"
					}
				},
				"true ? 'one' : 'two'": {
					code: "true ? 'one' : 'two'",
					result: {
						code: true,
						conditional: [
							{
								code: false,
								conditional: false,
								range: [7, 12],
								value: "one"
							},
							{
								code: false,
								conditional: false,
								range: [15, 20],
								value: "two"
							}
						],
						range: undefined,
						value: ""
					}
				},
				"true ? true ? 'one' : 'two' : true ? 'three': 'four'": {
					code: "true ? true ? 'one' : 'two' : true ? 'three': 'four'",
					result: {
						code: true,
						conditional: [
							{
								code: false,
								conditional: false,
								range: [14, 19],
								value: "one"
							},
							{
								code: false,
								conditional: false,
								range: [22, 27],
								value: "two"
							},
							{
								code: false,
								conditional: false,
								range: [37, 44],
								value: "three"
							},
							{
								code: false,
								conditional: false,
								range: [46, 52],
								value: "four"
							}
						],
						range: undefined,
						value: ""
					}
				}
			};
			for (const name of Object.keys(cases)) {
				const expr = /** @type {Record<string, EXPECTED_ANY>} */ (cases)[name];

				it(name, () => {
					const parser = new JavascriptParser();
					const ast = estree(expr.code, { ecmaVersion: "latest", ranges: true });
					expect(typeof ast).toBe("object");
					expect(
						parser.parseCalculatedString(
							/** @type {import("estree").Expression} */ (
								/** @type {EXPECTED_ANY} */ (ast.body[0]).expression
							)
						)
					).toEqual(expr.result);
				});
			}
		});
	});

	describe("BasicEvaluatedExpression", () => {
		/** @type [string, boolean][] */
		const tests = [
			...["i", "g", "m", "y"].reduce((acc, flag) => {
				acc.push([flag, true]);
				acc.push([flag + flag, false]);
				return acc;
			}, /** @type {[string, boolean][]} */ ([])),
			["", true],
			["igm", true],
			["igmy", true],
			["igmyi", false],
			["igmya", false],
			["ai", false],
			["ia", false]
		];

		for (const [suite, expected] of tests) {
			it(`BasicEvaluatedExpression.isValidRegExpFlags(${JSON.stringify(
				suite
			)})`, () => {
				expect(BasicEvaluatedExpression.isValidRegExpFlags(suite)).toBe(
					expected
				);
			});
		}
	});

	describe("defined-identifier evaluation fast path", () => {
		/** @type {import("../../lib/module/Parser").ParserState} */
		const state = /** @type {EXPECTED_ANY} */ ({});

		it("still walks callee and arguments of defined-callee calls", () => {
			const parser = new JavascriptParser();
			/** @type {string[]} */
			const seen = [];
			parser.hooks.expression.for("marker").tap("Test", () => {
				seen.push("marker");
				return true;
			});
			parser.parse(fixture("javascript", "javascript-parser-defined-identifier-evaluation-fast-path-still-walks-callee"), state);
			expect(seen).toEqual(["marker"]);
		});

		it("honors plugin evaluate taps on defined callees", () => {
			// a plugin tap on evaluate.for("Identifier") disables the fast path,
			// so its identifier result must reach the call hooks
			const parser = new JavascriptParser();
			parser.hooks.evaluate.for("Identifier").tap("TestPlugin", (expr) => {
				if (/** @type {{ name: string }} */ (expr).name === "f") {
					return new BasicEvaluatedExpression()
						.setIdentifier(
							"fake",
							"fake",
							() => [],
							() => [],
							() => []
						)
						.setRange(/** @type {[number, number]} */ (expr.range));
				}
			});
			/** @type {number[]} */
			const calls = [];
			parser.hooks.call.for("fake").tap("Test", () => {
				calls.push(1);
				return true;
			});
			parser.parse(fixture("javascript", "javascript-parser-defined-identifier-evaluation-fast-path-honors-plugin"), state);
			expect(calls).toEqual([1]);
		});

		it("does not treat tagged variables as plain defined", () => {
			const parser = new JavascriptParser();
			const TAG = Symbol("test tag");
			parser.hooks.statement.tap("Test", (statement) => {
				if (statement.type === "FunctionDeclaration") {
					parser.tagVariable("f", TAG);
				}
				return undefined;
			});
			/** @type {number[]} */
			const evaluated = [];
			parser.hooks.evaluateIdentifier.for(TAG).tap("Test", (expr) => {
				evaluated.push(/** @type {[number, number]} */ (expr.range)[0]);
				return undefined;
			});
			parser.parse(fixture("javascript", "javascript-parser-defined-identifier-evaluation-fast-path-does-not-treat-tagged"), state);
			// the tagged callee took the full evaluation path
			expect(evaluated).toHaveLength(1);
		});
	});

	describe("new import call (import phases)", () => {
		/**
		 * @param {string} source source
		 * @returns {Error | null} thrown error, if any
		 */
		function parse(source) {
			try {
				new JavascriptParser("auto", { importPhases: true }).parse(
					source,
					/** @type {import("../../lib/module/Parser").ParserState} */ (
						/** @type {unknown} */ ({ source })
					)
				);
				return null;
			} catch (err) {
				return /** @type {Error} */ (err);
			}
		}

		// `import.defer(...)`/`import.source(...)` are CallExpressions, so they
		// cannot be the operand of `new`, including with member access (#21212).
		for (const name of [
			"javascript-parser-import-phases-rejects-new-of-an-import-call",
			"javascript-parser-import-phases-rejects-new-of-an-import-call-2",
			"javascript-parser-import-phases-rejects-new-of-an-import-call-3",
			"javascript-parser-import-phases-rejects-new-of-an-import-call-4"
		]) {
			const source = fixture("javascript", name);
			it(`rejects ${JSON.stringify(source)}`, () => {
				const err = parse(source);
				expect(err).toBeInstanceOf(SyntaxError);
				expect(/** @type {Error} */ (err).message).toMatch(
					/^import call cannot be the target of `new`/
				);
			});
		}

		// Parenthesized forms and non-`new` member access stay valid.
		for (const name of [
			"javascript-parser-import-phases-accepts-a-parenthesized-or-member-import-call",
			"javascript-parser-import-phases-accepts-a-parenthesized-or-member-import-call-2"
		]) {
			const source = fixture("javascript", name);
			it(`accepts ${JSON.stringify(source)}`, () => {
				expect(parse(source)).toBeNull();
			});
		}
	});

	describe("getLocation", () => {
		/**
		 * @param {string} source source code
		 * @returns {JavascriptParser} parser with an active source mapping
		 */
		function parserFor(source) {
			const parser = new JavascriptParser("module");
			parser._source = source;
			return parser;
		}

		it("should derive the location from start/end offsets", () => {
			const parser = parserFor("a;\nbb;\n");
			expect(parser.getLocation({ start: 3, end: 5 })).toEqual({
				start: { line: 2, column: 0 },
				end: { line: 2, column: 2 }
			});
		});

		it("should derive the location from a range", () => {
			const parser = parserFor("a;\nbb;\n");
			expect(parser.getLocation({ range: [0, 1] })).toEqual({
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			});
		});

		it("should fall back to a copy of `loc` without source text", () => {
			const parser = new JavascriptParser("module");
			const loc = {
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			};
			const location = parser.getLocation({ start: 0, end: 1, loc });
			expect(location).toEqual(loc);
			expect(location).not.toBe(loc);
		});

		it("should fall back to a copy of `loc` for nodes without offsets", () => {
			const parser = parserFor("a;");
			const loc = {
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			};
			const location = parser.getLocation({ loc });
			expect(location).toEqual(loc);
			expect(location).not.toBe(loc);
		});

		it("should leave a missing `loc` alone without source text", () => {
			const parser = new JavascriptParser("module");
			expect(parser.getLocation({ start: 0, end: 1 })).toBeUndefined();
		});

		// Every ECMAScript line terminator starts a line, CRLF counting once.
		const lineBreakCases = /** @type {[string, string, number[]][]} */ ([
			["lf", "a;\nbb;\nccc;", [0, 3, 7]],
			["crlf", "a;\r\nbb;\r\nccc;", [0, 4, 9]],
			["lone cr", "a;\rbb;\rccc;", [0, 3, 7]],
			["mixed cr and lf", "a;\rbb;\nccc;", [0, 3, 7]],
			["line separator", "a;\u2028bb;\u2028ccc;", [0, 3, 7]],
			["paragraph separator", "a;\u2029bb;\u2029ccc;", [0, 3, 7]]
		]);

		for (const [name, source, starts] of lineBreakCases) {
			it(`should map offsets across ${name} line breaks`, () => {
				const parser = parserFor(source);
				for (let line = 0; line < starts.length; line++) {
					const start = starts[line];
					expect(parser.getLocation({ start, end: start + 1 })).toEqual({
						start: { line: line + 1, column: 0 },
						end: { line: line + 1, column: 1 }
					});
				}
			});
		}

		it("should reuse the location converter across calls", () => {
			const parser = parserFor("a;\nbb;\n");
			expect(parser.getLocation({ start: 0, end: 1 })).toEqual({
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			});
			const converter = parser._locConverter;
			expect(converter).toBeDefined();
			expect(parser.getLocation({ start: 4, end: 5 })).toEqual({
				start: { line: 2, column: 1 },
				end: { line: 2, column: 2 }
			});
			expect(parser._locConverter).toBe(converter);
		});

		it("should count every ECMAScript line terminator", () => {
			const parser = parserFor("a;\rb;\u2028c;\u2029d;\r\ne;");
			for (const [start, line] of [[3, 2], [6, 3], [9, 4], [13, 5]]) {
				expect(parser.getLocation({ start, end: start })).toEqual({
					start: { line, column: 0 },
					end: { line, column: 0 }
				});
			}
		});
	});

	describe("hoisted declarations", () => {
		const EVERY_POSITION = fixture("javascript", "javascript-parser-hoisted-declarations-every-position");

		/**
		 * @param {string | object} source what to parse
		 * @param {("auto" | "module" | "script")=} sourceType the source type to parse it as
		 * @param {boolean=} legacy whether to tap the hook that walks every statement
		 * @returns {string[]} the names the hoisting pass declared, in order
		 */
		const hoistedNames = (source, sourceType = "script", legacy = false) => {
			const parser = new JavascriptParser(sourceType);
			/** @type {string[]} */
			const names = [];
			if (legacy) parser.hooks.preStatement.tap("test", () => {});
			parser.hooks.preDeclarator.tap("test", (declarator) => {
				names.push(/** @type {EXPECTED_ANY} */ (declarator.id).name);
			});
			parser.hooks.preStatementByType
				.for("FunctionDeclaration")
				.tap("test", (statement) => {
					names.push(/** @type {EXPECTED_ANY} */ (statement).id.name);
				});
			parser.parse(
				/** @type {EXPECTED_ANY} */ (source),
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			return names;
		};

		it("reaches every position a `var` or function declaration hoists from", () => {
			expect(hoistedNames(EVERY_POSITION)).toEqual([
				"top",
				"topFunction",
				"fromIf",
				"fromElse",
				"fromFor",
				"fromForBody",
				"fromForIn",
				"fromForInBody",
				"fromForOf",
				"fromForOfBody",
				"fromWhile",
				"fromDoWhile",
				"fromLabeled",
				"fromWith",
				"fromTry",
				"fromCatch",
				"fromFinally",
				"fromCase",
				"fromDefault",
				"fromBlock",
				"blockFunction",
				"outer",
				"lexical",
				"alsoLexical",
				"inOuter"
			]);
		});

		it("collects its own from an AST another parser built", () => {
			const { ast, comments } = parseWithComments(EVERY_POSITION, "script");
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(hoistedNames(ast)).toEqual(hoistedNames(EVERY_POSITION));
		});

		it("walks every statement again for a tap that expects them", () => {
			const source =
				fixture("javascript", "javascript-parser-hoisted-declarations-walks-every-statement-again-for-a-tap");
			/**
			 * @param {(parser: EXPECTED_ANY) => void} tap what to tap with
			 * @returns {string[]} the statement types the pre-walk reported
			 */
			const seen = (tap) => {
				const parser = new JavascriptParser("script");
				/** @type {string[]} */
				const types = [];
				parser.hooks.preStatement.tap("test", (statement) => {
					types.push(statement.type);
				});
				tap(parser);
				parser.parse(
					source,
					/** @type {import("../../lib/module/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return types;
			};
			// a broadcast tap reaches the statements the record leaves out
			expect(seen(() => {})).toContain("DebuggerStatement");
			// so does a typed tap for a statement the record does not carry
			/** @type {string[]} */
			const typed = [];
			const parser = new JavascriptParser("script");
			parser.hooks.preStatementByType
				.for("DebuggerStatement")
				.tap("test", (statement) => {
					typed.push(statement.type);
				});
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(typed).toEqual(["DebuggerStatement", "DebuggerStatement"]);
		});

		it("declares the same names through the walk that tap turns back on", () => {
			expect(hoistedNames(EVERY_POSITION, "script", true)).toEqual(
				hoistedNames(EVERY_POSITION)
			);
			// the positions `EVERY_POSITION` fills: a `try` missing one of its
			// two tails, and a loop head declaring nothing
			const sparse = fixture("javascript", "javascript-parser-hoisted-declarations-declares-the-same-names-through-the-walk");
			expect(hoistedNames(sparse, "script", true)).toEqual(
				hoistedNames(sparse)
			);
			expect(hoistedNames(sparse)).toContain("fromForOfTarget");
		});

		it("reports the statement written before each module declaration", () => {
			// removing a module declaration can join the statements around it
			// through ASI, so what precedes it decides whether a `;` is needed
			const source =
				fixture("javascript", "javascript-parser-hoisted-declarations-reports-the-statement-written-before");
			const parser = new JavascriptParser("module");
			/** @type {(string | undefined)[]} */
			const before = [];
			const record = () => {
				before.push(
					parser.prevStatement === undefined
						? undefined
						: parser.prevStatement.type
				);
			};
			parser.hooks.exportImport.tap("test", record);
			parser.hooks.import.tap("test", record);
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(before).toEqual([
				"VariableDeclaration",
				"ExportNamedDeclaration"
			]);
		});

		it("scans a statement list when a plugin drives the walk itself", () => {
			const source =
				fixture("javascript", "javascript-parser-hoisted-declarations-scans-a-statement-list-when-a-plugin");
			const parser = new JavascriptParser("module");
			/** @type {string[]} */
			const reported = [];
			parser.hooks.import.tap("test", (statement, importSource) => {
				reported.push(`import ${importSource}`);
			});
			parser.hooks.exportImport.tap("test", (statement, importSource) => {
				reported.push(`exportImport ${importSource}`);
			});
			// a plugin taking the program over reaches the deprecated scan itself
			parser.hooks.program.tap("test", (ast) => {
				parser.modulePreWalkStatements(ast.body);
				return true;
			});
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(reported).toEqual(["import ./a", "exportImport ./b"]);
		});

		it("scans its own module declarations from an AST another parser built", () => {
			const source =
				fixture("javascript", "javascript-parser-hoisted-declarations-scans-its-own-module-declarations-from");
			/**
			 * @param {string | object} parsed what to parse
			 * @returns {string[]} the sources reported, in order
			 */
			const reported = (parsed) => {
				const parser = new JavascriptParser("module");
				/** @type {string[]} */
				const sources = [];
				parser.hooks.import.tap("test", (statement, importSource) => {
					sources.push(`import ${importSource}`);
				});
				parser.hooks.exportImport.tap("test", (statement, importSource) => {
					sources.push(`exportImport ${importSource}`);
				});
				parser.hooks.export.tap("test", () => {
					sources.push("export");
				});
				parser.parse(
					/** @type {EXPECTED_ANY} */ (parsed),
					/** @type {import("../../lib/module/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return sources;
			};
			const { ast, comments } = parseWithComments(source, "module");
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(reported(ast)).toEqual(reported(source));
			expect(reported(source)).toContain("import ./a");
		});

		it("ignores the record of an AST handed to it, which may have been edited", () => {
			const { ast, comments } = parseWithComments("var first = 1;", "script");
			const { ast: spliced } = parseWithComments("var second = 2;", "script");
			// a loader may hand back a tree it changed after it was read, so the
			// record the parse left on it no longer says what the tree declares
			/** @type {EXPECTED_ANY} */
			(ast).body.push(/** @type {EXPECTED_ANY} */ (spliced).body[0]);
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(hoistedNames(ast)).toEqual(["first", "second"]);
		});

		it("keeps a declaration under an `export` head out of the scope's list", () => {
			// the export statement reports its own declaration, so listing it
			// again would declare it twice
			expect(
				hoistedNames(
					fixture("javascript", "javascript-parser-hoisted-declarations-keeps-a-declaration-under-an-export-head"),
					"module"
				)
			).toEqual(["plain", "exported", "exportedFunction"]);
		});
	});

	describe("block declarations", () => {
		const EVERY_POSITION = fixture("javascript", "javascript-parser-block-declarations-every-position");

		/**
		 * @param {string | object} source what to parse
		 * @param {boolean=} legacy whether to tap the hook that walks every statement
		 * @returns {string[]} the names the block pass declared, in order
		 */
		const blockNames = (source, legacy = false) => {
			const parser = new JavascriptParser("module");
			/** @type {string[]} */
			const names = [];
			if (legacy) parser.hooks.blockPreStatement.tap("test", () => {});
			parser.hooks.preDeclarator.tap("test", (declarator, statement) => {
				if (statement.kind === "var") return;
				names.push(/** @type {EXPECTED_ANY} */ (declarator.id).name);
			});
			parser.hooks.blockPreStatementByType
				.for("ClassDeclaration")
				.tap("test", (statement) => {
					names.push(
						/** @type {EXPECTED_ANY} */ (statement).id.name
					);
				});
			parser.parse(
				/** @type {EXPECTED_ANY} */ (source),
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			return names;
		};

		it("reaches every position a block scope binds a name from", () => {
			// every name the program itself binds comes first: the block pass reads
			// the whole list before the walk descends into any of it
			expect(blockNames(EVERY_POSITION)).toEqual([
				"top",
				"alsoTop",
				"alsoUsing",
				"TopClass",
				"exported",
				"DefaultClass",
				"WithStatic",
				"inBlock",
				"InBlock",
				"inIf",
				"inElse",
				"inFor",
				"inForOfBody",
				"index",
				"inForBody",
				"key",
				"inForInBody",
				"inWhile",
				"inDoWhile",
				"inLabeled",
				"inTry",
				"inCatch",
				"inFinally",
				"inCase",
				"inDefault",
				"inCaseBlock",
				"inFunction",
				"inStaticBlock"
			]);
		});

		it("declares the same names through the walk that tap turns back on", () => {
			expect(blockNames(EVERY_POSITION, true)).toEqual(
				blockNames(EVERY_POSITION)
			);
		});

		it("collects its own from an AST another parser built", () => {
			const { ast, comments } = parseWithComments(EVERY_POSITION, "module");
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(blockNames(ast)).toEqual(blockNames(EVERY_POSITION));
		});

		it("reports the statement written before each declaration", () => {
			// removing an `export` can join the statements around it through ASI,
			// so what precedes it decides whether a `;` is needed
			const source =
				fixture("javascript", "javascript-parser-block-declarations-reports-the-statement-written-before-each");
			const parser = new JavascriptParser("module");
			/** @type {(string | undefined)[]} */
			const before = [];
			parser.hooks.exportSpecifier.tap("test", () => {
				before.push(
					parser.prevStatement === undefined
						? undefined
						: parser.prevStatement.type
				);
				return true;
			});
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			// the statement before the export, not the declaration the list records
			// before it: the two differ by every statement the record leaves out
			expect(before).toEqual(["DebuggerStatement"]);
		});

		it("reads the properties a destructuring assignment names", () => {
			const source = fixture("javascript", "javascript-parser-block-declarations-reads-the-properties-a-destructuring");
			/**
			 * @param {boolean} legacy whether to tap the hook that walks them all
			 * @returns {number} how many times the collect hook was asked
			 */
			const collected = (legacy) => {
				const parser = new JavascriptParser("module");
				let asked = 0;
				if (legacy) parser.hooks.blockPreStatement.tap("test", () => {});
				parser.hooks.collectDestructuringAssignmentProperties.tap(
					"test",
					() => {
						asked++;
						return true;
					}
				);
				parser.parse(
					source,
					/** @type {import("../../lib/module/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return asked;
			};
			expect(collected(false)).toBe(1);
			expect(collected(true)).toBe(collected(false));
		});

		it("declares a statement past the indices a mask holds", () => {
			// a mask is one 31-bit number, so a later index must take the list
			expect(blockNames(fixture("javascript", "javascript-parser-block-declarations-declares-a-statement-past-the-indices-a-mask"))).toEqual([
				"early",
				"late"
			]);
		});

		it("rejects a statement written before the first case", () => {
			expect(() =>
				estree("switch (1) { notACase(); }", { sourceType: "module" })
			).toThrow(/Unexpected token/);
		});

		it("walks every statement again for a tap that expects them", () => {
			const source = fixture("javascript", "javascript-parser-block-declarations-walks-every-statement-again-for-a-tap-that");
			/** @type {string[]} */
			const typed = [];
			const parser = new JavascriptParser("module");
			parser.hooks.blockPreStatementByType
				.for("DebuggerStatement")
				.tap("test", (statement) => {
					typed.push(statement.type);
				});
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(typed).toEqual(["DebuggerStatement"]);
		});
	});

	describe("attached comments", () => {
		/**
		 * @param {string} source what to parse
		 * @param {number} index which statement to ask about
		 * @param {boolean} sourceAvailable whether the original source is available
		 * @returns {string} the source the comment run covers
		 */
		const attachedTo = (source, index, sourceAvailable = true) => {
			const parser = new JavascriptParser("module");
			const { ast, comments } = parseWithComments(source, "module");
			parser.comments = comments;
			parser._source = sourceAvailable ? source : undefined;
			const statement = ast.body[index];
			const target =
				(statement.type === "ExportNamedDeclaration" ||
					statement.type === "ExportDefaultDeclaration") &&
				statement.declaration
					? statement.declaration
					: statement;
			if (target !== statement) {
				parser.statementPath = [statement, target];
			}
			return source.slice(
				parser.getAttachedCommentsStart(target),
				/** @type {[number, number]} */ (statement.range)[0]
			);
		};

		it("covers the run of comments whitespace alone separates from it", () => {
			expect(attachedTo("/* a */\n/* b */\nfunction f() {}", 0)).toBe(
				"/* a */\n/* b */\n"
			);
		});

		it("reaches past the statement before it", () => {
			expect(attachedTo("first();\n/* a */\nfunction f() {}", 1)).toBe(
				"/* a */\n"
			);
		});

		it("stops at the last token written before it", () => {
			// the annotation was written for the `;`, so it is not this one's
			expect(attachedTo("first();\n/* a */\n;\nfunction f() {}", 2)).toBe("");
		});

		it("reads the statement itself when nothing precedes it", () => {
			expect(attachedTo("function f() {}", 0)).toBe("");
		});

		it("ignores comments inside and after the statement", () => {
			expect(
				attachedTo("/* before */function f() {/* inside */}\n/* after */", 0)
			).toBe("/* before */");
			expect(attachedTo("function f() {/* inside */}\n/* after */", 0)).toBe(
				""
			);
		});

		it("keeps the conservative comment run without source text", () => {
			expect(
				attachedTo(
					"/* first */first();\n/* second */function f() {}/* after */",
					1,
					false
				)
			).toBe("/* first */first();\n/* second */");
		});

		it.each(["export function f() {}", "export default function() {}"])(
			"finds comments before %s",
			(declaration) => {
				expect(attachedTo(`/* before */${declaration}/* after */`, 0)).toBe(
					"/* before */"
				);
			}
		);

		it("does not read every later comment to find an attached run", () => {
			const source = "/* before */function f() {}" + "/* after */".repeat(1024);
			const parser = new JavascriptParser("module");
			const { ast, comments } = parseWithComments(source, "module");
			let reads = 0;
			for (const comment of comments) {
				const range = comment.range;
				Object.defineProperty(comment, "range", {
					get() {
						reads++;
						return range;
					}
				});
			}
			parser.comments = comments;
			parser._source = source;
			expect(parser.getAttachedCommentsStart(ast.body[0])).toBe(0);
			expect(reads).toBeLessThan(32);
		});
	});

	describe("WebpackParser fast paths", () => {
		/**
		 * @param {string} source source code
		 * @returns {EXPECTED_ANY} program AST (loosely typed for node access)
		 */
		const parse = (source) =>
			/** @type {EXPECTED_ANY} */ (estree(source, { ecmaVersion: 2022 }));

		it("shares one string between an escape-free quasi's raw and cooked", () => {
			// eslint-disable-next-line no-template-curly-in-string
			const tl = parse("`plain ${1} tail`").body[0].expression;
			expect(tl.quasis[0].value.raw).toBe("plain ");
			expect(tl.quasis[0].value.raw).toBe(tl.quasis[0].value.cooked);
			expect(tl.quasis[1].value.raw).toBe(tl.quasis[1].value.cooked);
		});

		it("keeps raw and cooked distinct for quasis with escapes or CRLF", () => {
			const esc = parse("`a\\nb`").body[0].expression.quasis[0].value;
			expect(esc.raw).toBe("a\\nb");
			expect(esc.cooked).toBe("a\nb");
			const crlf = parse("`a\r\nb`").body[0].expression.quasis[0].value;
			expect(crlf.raw).toBe("a\nb");
			expect(crlf.cooked).toBe("a\nb");
			const cr = parse("`a\rb`").body[0].expression.quasis[0].value;
			expect(cr.raw).toBe("a\nb");
			expect(cr.cooked).toBe("a\nb");
		});

		it("detects __proto__ redefinition in nested object literals", () => {
			// exercises the pooled prop-clash records at two nesting depths
			expect(() =>
				parse("({ __proto__: 1, a: { __proto__: 2 }, __proto__: 3 })")
			).toThrow(/Redefinition of __proto__/);
			expect(() => parse("({ a: { __proto__: 1, __proto__: 2 } })")).toThrow(
				/Redefinition of __proto__/
			);
			// reuse across sequential literals must reset the record
			expect(() =>
				parse("({ __proto__: 1 }); ({ __proto__: 2 });")
			).not.toThrow();
		});

		it("reads a regular expression after `yield` in a generator method, as V8 does", () => {
			const programs = [
				"class K { *m() { yield /a/g; } }",
				"class K { static async *m() { yield /a/g; } }",
				"({ *m() { yield /a/g; } });",
				"({ async *m() { yield /a/g; } });",
				"(async function* () { yield /a/g; });",
				// the token after a nested body is read before its scope exits
				"function* g() { function f() {} yield /a/g; }",
				"class K { *m() { function f() {} yield /a/g; } }",
				"function* g() { var h = () => 1\nyield /a/g; }"
			];
			for (const read of [parse]) {
				for (const source of programs) {
					let argument;
					JSON.stringify(read(source), (key, value) => {
						if (value && value.type === "YieldExpression") {
							argument = value.argument;
						}
						return value;
					});
					expect(argument).toMatchObject({ regex: { pattern: "a" } });
				}
				// In a plain method inside a generator, `yield` is a name divided.
				const method = read(
					"function* g() { ({ m() { return yield / 2 / 1; } }); }"
				);
				expect(
					method.body[0].body.body[0].expression.properties[0].value.body
						.body[0].argument
				).toMatchObject({ type: "BinaryExpression", operator: "/" });
				// After a nested generator, a sloppy function's `yield` is a name.
				const nested = read("function f() { function* g() {} yield / 2 / 1; }");
				expect(nested.body[0].body.body[1].expression).toMatchObject({
					type: "BinaryExpression",
					operator: "/"
				});
			}
		});

		it("validates regexp flags from the precomputed whitelist", () => {
			expect(parse("/a/gimsy;").body[0].expression.regex.flags).toBe("gimsy");
			expect(() => parse("/a/q;")).toThrow(/Invalid regular expression flag/);
			expect(() => parse("/a/gg;")).toThrow(
				/Duplicate regular expression flag/
			);
			// `v` needs ES2024 — invalid at the pinned ecmaVersion 2022
			expect(() => parse("/a/v;")).toThrow(/Invalid regular expression flag/);
		});

		it("validates a pattern the engine rejects against the property tables", () => {
			// the `\\p{...}` name tables load on this path alone, and are memoized
			// for the second literal
			expect(() => parse("/\\p{Bogus_Property}/u;")).toThrow(
				/Invalid property name/
			);
			expect(() => parse("/\\p{Script=Nonesuch}/u;")).toThrow(
				/Invalid property value/
			);
			expect(
				parse("/\\p{Script=Greek}/u;").body[0].expression.regex.flags
			).toBe("u");
		});

		it("answers repeated ASI probes across a comment-holding gap", () => {
			// the newline scan memoizes into the tokenizer's flag; both outcomes
			const asi = parse("function f() { return /*\n*/ 1 }");
			expect(asi.body[0].body.body[0].argument).toBeNull();
			const noAsi = parse("function f() { return /* x */ 1 }");
			expect(noAsi.body[0].body.body[0].argument.value).toBe(1);
		});

		it("classifies keywords from the per-slot memo on repeated parses", () => {
			const src =
				"function gate(input) { if (input) return input; return null; }";
			// first parse fills the word-type memo; the second serves from it
			const first = parse(src);
			const second = parse(src);
			expect(first.body[0].type).toBe("FunctionDeclaration");
			expect(second.body[0].type).toBe("FunctionDeclaration");
			expect(second.body[0].body.body[0].type).toBe("IfStatement");
		});

		it("re-classifies a cache-hit word under a different keyword set", () => {
			// same words, distinct WordLookups: the second parse hits WORD_CACHE
			// but misses the other option set's memo and must re-classify
			const src = "value1 = value2 instanceof Gate;";
			const modern = parse(src);
			const legacy = /** @type {EXPECTED_ANY} */ (
				estree(src, { ecmaVersion: 5 })
			);
			expect(modern.body[0].expression.right.operator).toBe("instanceof");
			expect(legacy.body[0].expression.right.operator).toBe("instanceof");
		});

		it("classifies escaped keywords via the cold word path", () => {
			expect(() => parse("\\u0069f (x) y;")).toThrow(
				/Escape sequence in keyword/
			);
		});

		it("classifies one-char and over-long words off the word cache", () => {
			const short = parse("a + b;").body[0].expression;
			expect(short.left.name).toBe("a");
			expect(short.right.name).toBe("b");
			const long = parse("extraordinarilyLongIdentifier = 1;").body[0]
				.expression;
			expect(long.left.name).toBe("extraordinarilyLongIdentifier");
		});

		it("rejects a conditional whose test is a bare arrow (identity probe)", () => {
			expect(() => parse("() => {} ? a : b")).toThrow(/Unexpected token/);
			// the probe must not leak across expressions: a later conditional works
			const ok = parse("f = (x) => x + 1; y = c ? a : b;");
			expect(ok.body[0].expression.right.type).toBe("ArrowFunctionExpression");
			expect(ok.body[1].expression.right.type).toBe("ConditionalExpression");
		});

		it("rejects `**` with a bare arrow left operand like acorn 8.18", () => {
			expect(() => parse("x = () => {} ** 2")).toThrow(/Unexpected token/);
			const ok = parse("x = (() => {}) ** 2").body[0].expression.right;
			expect(ok.type).toBe("BinaryExpression");
			expect(ok.operator).toBe("**");
			expect(() => parse("x = -2 ** 2")).toThrow(/Unexpected token/);
		});

		it("preserves LS/PS in cooked template chunks read by the cold reader", () => {
			// the escape forces the cold reader; LS must survive while CR/LF cook
			const value = parse("`a\\tb\u2028c\rd\ne`").body[0].expression.quasis[0]
				.value;
			expect(value.cooked).toBe("a\tb\u2028c\nd\ne");
			expect(value.raw).toBe("a\\tb\u2028c\nd\ne");
		});

		it("serves repeated short literal raws from one cached string", () => {
			const [first, second] = parse("x = 123456; y = 123456;").body;
			expect(first.expression.right.raw).toBe("123456");
			// identity: strings compare by value, so sharing is unobservable
			// beyond the allocation it saves — pinned here to keep the cache wired
			expect(second.expression.right.raw).toBe(first.expression.right.raw);
			const long = parse("z = 'quite a long string literal';").body[0];
			expect(long.expression.right.value).toBe("quite a long string literal");
			const fraction = parse("w = 123456789.0123456;").body[0];
			expect(fraction.expression.right.value).toBe(123456789.0123456);
			expect(fraction.expression.right.raw).toBe("123456789.0123456");
		});

		it("still detects parameter clashes without the per-body clash record", () => {
			// strict mode: multi-param duplicate must throw, 0/1-param must not
			expect(() => parse("'use strict'; function f(a, a) {}")).toThrow(
				/Argument name clash/
			);
			expect(() => parse("'use strict'; function f(a) {}")).not.toThrow();
			// one destructuring param carries two names — the record path
			expect(() => parse("function f({ a: x, b: x }) {}")).toThrow(
				/Argument name clash/
			);
		});

		it("keeps scope bindings isolated across pooled sibling scopes", () => {
			// a pooled scope must not leak names or the simple-catch marker
			expect(() =>
				parse("{ let a; } { let a; } try {} catch (e) { var e; }")
			).not.toThrow();
			// block-level function declarations exercise the functions-set harvest
			expect(() =>
				parse("{ function g() {} } { let g; function h() {} }")
			).not.toThrow();
			expect(() => parse("{ let a; } { let b; let b; }")).toThrow(
				/already been declared/
			);
			expect(() => parse("try {} catch (a) {} { let x; var x; }")).toThrow(
				/already been declared/
			);
		});

		it("keeps labels isolated across pooled function bodies", () => {
			expect(() =>
				parse(
					"function f() { lab: for (;;) break lab; } function g() { lab: for (;;) break lab; }"
				)
			).not.toThrow();
			// a stale pooled label must not make this break resolvable
			expect(() =>
				parse("function f() { lab: ; } function g() { break lab; }")
			).toThrow(/Unsyntactic break/);
		});

		it("reports acorn's error for string names bound without `from`", () => {
			/**
			 * @param {string} source module source code
			 * @returns {() => void} thunk parsing the source as a module
			 */
			const parseModule = (source) => () =>
				estree(source, { sourceType: "module" });
			expect(parseModule('export { "x" };')).toThrow(
				/A string literal cannot be used as an exported binding without `from`/
			);
			expect(parseModule('import { "x" } from "y";')).toThrow(/Binding rvalue/);
		});

		it("serves comment ranges lazily with a stable memo and writable slot", () => {
			const { comments } = parseEstree("// hi\nvar x = 1; /* block */", {
				ecmaVersion: 2022,
				comments: true
			});
			expect(comments).toHaveLength(2);
			const line = comments[0];
			expect(line.range).toEqual([0, 5]);
			// memoized: repeated reads return one array identity
			expect(line.range).toBe(line.range);
			expect(line.value).toBe(" hi");
			const block = comments[1];
			expect(block.range).toEqual([17, 28]);
			block.range = [1, 2];
			expect(block.range).toEqual([1, 2]);
		});

	});

	describe("write hooks", () => {
		/**
		 * @param {string} source source to parse
		 * @param {"write" | "writeMemberChain"} hook the hook to tap
		 * @param {boolean} handled what the tap returns
		 * @returns {string[]} the names the walk reported as read
		 */
		const readsWith = (source, hook, handled) => {
			const parser = new JavascriptParser();
			/** @type {string[]} */
			const reads = [];
			parser.hooks[hook].for("x").tap("JavascriptParserTest", () => handled);
			parser.hooks.expression.for("x").tap("JavascriptParserTest", () => {
				reads.push("x");
			});
			parser.hooks.expressionMemberChain
				.for("x")
				.tap("JavascriptParserTest", () => {
					reads.push("x");
					return true;
				});
			parser.parse(
				source,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			return reads;
		};

		it("reports an update and still walks the target it reads", () => {
			expect(readsWith(fixture("javascript", "javascript-parser-write-hooks-reports-an-update-and-still-walks-the-target-it"), "write", false)).toEqual(["x"]);
			expect(readsWith(fixture("javascript", "javascript-parser-write-hooks-reports-an-update-and-still-walks-the-target-it-2"), "writeMemberChain", false)).toEqual(["x"]);
		});

		it("lets a tap that rendered the whole update stop the walk", () => {
			expect(readsWith(fixture("javascript", "javascript-parser-write-hooks-lets-a-tap-that-rendered-the-whole-update-stop"), "write", true)).toEqual([]);
			expect(readsWith(fixture("javascript", "javascript-parser-write-hooks-lets-a-tap-that-rendered-the-whole-update-stop-2"), "writeMemberChain", true)).toEqual([]);
		});
	});
});
