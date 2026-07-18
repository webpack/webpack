"use strict";

/* eslint-disable no-unused-expressions, no-unassigned-vars, func-names */

// cspell:ignore fghsub notry fghsub notry notry this's ijksub this's ijksub fghsub fghsub notry ijksub ijksub strrring strrring strr strrring strrring strr Sstrrringy strone stronetwo stronetwothree stronetwo stronetwothree stronetwothreefour onetwo onetwo twothree twothree twothree threefour onetwo onetwo threefour threefour fourfive startstrmid igmy igmyi igmya
const BasicEvaluatedExpression = require("../lib/javascript/BasicEvaluatedExpression");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

describe("JavascriptParser", () => {
	/* eslint-disable no-unused-vars */
	/** @type {EXPECTED_ANY} */ let abc;
	/** @type {EXPECTED_ANY} */ let cde;
	/** @type {EXPECTED_ANY} */ let fgh;
	/** @type {EXPECTED_ANY} */ let memberExpr;
	/** @type {EXPECTED_ANY} */ let ijk;
	/** @type {EXPECTED_ANY} */ let xyz;
	const testCases = /** @type {EXPECTED_ANY} */ ({
		"call ident": [
			function () {
				abc("test");
			},
			{
				abc: ["test"]
			}
		],
		"call member": [
			function () {
				cde.abc("membertest");
			},
			{
				cdeabc: ["membertest"]
			}
		],
		"call member using bracket notation": [
			function () {
				// eslint-disable-next-line dot-notation
				cde["abc"]("membertest");
			},
			{
				cdeabc: ["membertest"]
			}
		],
		"call inner member": [
			function () {
				cde.ddd.abc("inner");
			},
			{
				cdedddabc: ["inner"]
			}
		],
		"call inner member using bracket notation": [
			function () {
				// eslint-disable-next-line dot-notation
				cde.ddd["abc"]("inner");
			},
			{
				cdedddabc: ["inner"]
			}
		],
		expression: [
			function () {
				fgh;
			},
			{
				fgh: [""]
			}
		],
		"expression sub": [
			function () {
				fgh.sub;
			},
			{
				fghsub: ["notry"]
			}
		],
		"member expression": [
			function () {
				// @ts-expect-error
				test[memberExpr];

				// @ts-expect-error
				test[+memberExpr]; // eslint-disable-line no-implicit-coercion
			},
			{
				expressions: ["memberExpr", "memberExpr"]
			}
		],
		"in function definition": [
			function () {
				(function (abc, cde, fgh) {
					// @ts-expect-error
					abc("test");
					// @ts-expect-error
					cde.abc("test");
					// @ts-expect-error
					cde.ddd.abc("test");
					fgh;
					// @ts-expect-error
					fgh.sub;
				})();
			},
			{}
		],
		"const definition": [
			function () {
				// eslint-disable-next-line one-var
				let abc, cde, fgh;
				// @ts-expect-error
				abc("test");
				// @ts-expect-error
				cde.abc("test");
				// @ts-expect-error
				cde.ddd.abc("test");
				fgh;
				// @ts-expect-error
				fgh.sub;
			},
			{}
		],
		"var definition": [
			function () {
				// eslint-disable-next-line one-var
				let abc, cde, fgh;
				// @ts-expect-error
				abc("test");
				// @ts-expect-error
				cde.abc("test");
				// @ts-expect-error
				cde.ddd.abc("test");
				fgh;
				// @ts-expect-error
				fgh.sub;
			},
			{}
		],
		"function definition": [
			function () {
				function abc() {}

				function cde() {}

				function fgh() {}
				// @ts-expect-error
				abc("test");
				// @ts-expect-error
				cde.abc("test");
				// @ts-expect-error
				cde.ddd.abc("test");
				fgh;
				// @ts-expect-error
				fgh.sub;
			},
			{}
		],
		"class definition": [
			function () {
				class memberExpr {
					cde() {
						abc("cde");
					}

					static fgh() {
						abc("fgh");
						fgh();
					}
				}
			},
			{
				abc: ["cde", "fgh"],
				fgh: ["memberExpr"]
			}
		],
		"in try": [
			function () {
				try {
					fgh.sub;
					fgh;

					// @ts-expect-error
					function test(ttt) {
						fgh.sub;
						fgh;
					}
				} catch (err) {
					fgh.sub;
					fgh;
				}
			},
			{
				fghsub: ["try", "notry", "notry"],
				fgh: ["test", "test ttt", "test err"]
			}
		],
		"renaming with const": [
			function () {
				const xyz = abc;
				xyz("test");
			},
			{
				abc: ["test"]
			}
		],
		"renaming with var": [
			function () {
				const xyz = abc;
				xyz("test");
			},
			{
				abc: ["test"]
			}
		],
		"renaming with assignment": [
			function () {
				const xyz = abc;
				xyz("test");
			},
			{
				abc: ["test"]
			}
		],
		"renaming with IIFE": [
			function () {
				// @ts-expect-error
				!(function (xyz) {
					xyz("test");
				})(abc);
			},
			{
				abc: ["test"]
			}
		],
		"renaming arguments with IIFE (called)": [
			function () {
				// @ts-expect-error
				!function (xyz) {
					xyz("test");
				}.call(fgh, abc);
			},
			{
				abc: ["test"],
				fgh: [""]
			}
		],
		"renaming this's properties with IIFE (called)": [
			function () {
				// @ts-expect-error
				!function () {
					// @ts-expect-error
					this.sub;
				}.call(ijk);
			},
			{
				ijksub: ["test"]
			}
		],
		"renaming this's properties with nested IIFE (called)": [
			function () {
				// @ts-expect-error
				!function () {
					// @ts-expect-error
					!function () {
						// @ts-expect-error
						this.sub;
						// @ts-expect-error
					}.call(this);
				}.call(ijk);
			},
			{
				ijksub: ["test"]
			}
		],
		"new Foo(...)": [
			function () {
				// eslint-disable-next-line new-cap, no-new
				new xyz("membertest");
			},
			{
				xyz: ["membertest"]
			}
		],
		"spread calls/literals": [
			function () {
				const xyz = [...abc("xyz"), cde];
				Math.max(...fgh);
			},
			{
				abc: ["xyz"],
				fgh: ["xyz"]
			}
		]
	});

	/* eslint-enable no-unused-vars */

	for (const name of Object.keys(testCases)) {
		it(`should parse ${name}`, () => {
			let source = /** @type {Record<string, EXPECTED_ANY[]>} */ (testCases)[
				name
			][0].toString();
			source = source.slice(13, -1).trim();
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
				/** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(typeof actual).toBe("object");
			expect(actual).toEqual(state);
		});
	}

	it("should parse comments", () => {
		const source = "//comment1\n/*comment2*/";
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
			/** @type {import("../lib/Parser").ParserState} */ (
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
		 * @param {string} source source
		 * @returns {import("../lib/javascript/BasicEvaluatedExpression")} the evaluated expression
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
							/** @type {import("../lib/javascript/JavascriptParser").Range} */ (
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
							/** @type {import("../lib/javascript/JavascriptParser").Range} */ (
								expr.range
							)
						)
				);
			return parser.parse(
				`test(${source});`,
				/** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			).result;
		}

		const testCases = {
			true: "bool=true",
			false: "bool=false",
			"!true": "bool=false",
			"!false": "bool=true",
			'"strrring"': "string=strrring",
			'"strr" + "ring"': "string=strrring",
			'"s" + ("trr" + "rin") + "g"': "string=strrring",
			"'S' + (\"strr\" + \"ring\") + 'y'": "string=Sstrrringy",
			"/abc/": "regExp=/abc/",
			1: "number=1",
			"1 + 3": "number=4",
			"3 - 1": "number=2",
			"2 * 3": "number=6",
			"8 / 2": "number=4",
			"2 ** 3": "number=8",
			"12 & 5": "number=4",
			"12 | 5": "number=13",
			"12 ^ 5": "number=9",
			"9 >>> 2": "number=2",
			"9 >> 2": "number=2",
			"9 << 2": "number=36",
			"~3": "number=-4",
			"1 == 1": "bool=true",
			"1 === 1": "bool=true",
			"3 != 1": "bool=true",
			"3 !== 1": "bool=true",
			"3 == 1": "bool=false",
			"3 === 1": "bool=false",
			"1 != 1": "bool=false",
			"1 !== 1": "bool=false",
			100.25: "number=100.25",
			"!100.25": "bool=false",
			"!+100.25": "bool=false",
			"!-100.25": "bool=false",
			0: "number=0",
			"!0": "bool=true",
			"!-0": "bool=true",
			"!+0": "bool=true",
			"20n": "bigint=20",
			"10n + 10n": "bigint=20",
			"10n - 5n": "bigint=5",
			"10n * 5n": "bigint=50",
			"10n / 5n": "bigint=2",
			"5n ** 2n": "bigint=25",
			"5n == 5n": "bool=true",
			"5n === 5n": "bool=true",
			"5n != 5n": "bool=false",
			"5n !== 5n": "bool=false",
			"5n != 1n": "bool=true",
			"5n !== 1n": "bool=true",
			"5n & 3n": "bigint=1",
			"5n | 2n": "bigint=7",
			"5n ^ 2n": "bigint=7",
			"5n >> 2n": "bigint=1",
			"5n << 2n": "bigint=20",
			"null == null": "bool=true",
			"null === null": "bool=true",
			"null != null": "bool=false",
			"null !== null": "bool=false",
			"true === false": "bool=false",
			"false !== false": "bool=false",
			"true == true": "bool=true",
			"false != true": "bool=true",
			"!'a'": "bool=false",
			"!''": "bool=true",
			"!null": "bool=true",
			"'pre' + a": "wrapped=['pre' string=pre]+[null]",
			"a + 'post'": "wrapped=[null]+['post' string=post]",
			"'pre' + a + 'post'": "wrapped=['pre' string=pre]+['post' string=post]",
			"1 + a + 2": "",
			"1 + a + 'post'": "wrapped=[null]+['post' string=post]",
			"'' + 1 + a + 2": "wrapped=['' + 1 string=1]+[2 string=2]",
			"'' + 1 + a + 2 + 3": "wrapped=['' + 1 string=1]+[2 + 3 string=23]",
			"'' + 1 + a + (2 + 3)": "wrapped=['' + 1 string=1]+[2 + 3 string=5]",
			"'pre' + (1 + a) + (2 + 3)":
				"wrapped=['pre' string=pre]+[2 + 3 string=5]",
			"a ? 'o1' : 'o2'": "options=['o1' string=o1],['o2' string=o2]",
			"a ? 'o1' : b ? 'o2' : 'o3'":
				"options=['o1' string=o1],['o2' string=o2],['o3' string=o3]",
			"a ? (b ? 'o1' : 'o2') : 'o3'":
				"options=['o1' string=o1],['o2' string=o2],['o3' string=o3]",
			"a ? (b ? 'o1' : 'o2') : c ? 'o3' : 'o4'":
				"options=['o1' string=o1],['o2' string=o2],['o3' string=o3],['o4' string=o4]",
			"a ? 'o1' : b ? 'o2' : c ? 'o3' : 'o4'":
				"options=['o1' string=o1],['o2' string=o2],['o3' string=o3],['o4' string=o4]",
			"a ? 'o1' : b ? b : c ? 'o3' : c":
				"options=['o1' string=o1],[b],['o3' string=o3],[c]",
			"['i1', 'i2', 3, a, b ? 4 : 5]":
				"items=['i1' string=i1],['i2' string=i2],[3 number=3],[a],[b ? 4 : 5 options=[4 number=4],[5 number=5]]",
			"typeof 'str'": "string=string",
			"typeof aString": "string=string",
			"typeof b.Number": "string=number",
			"typeof b['Number']": "string=number",
			"typeof b[Number]": "",
			"typeof true": "string=boolean",
			"typeof null": "string=object",
			"typeof 1": "string=number",
			"typeof 1n": "string=bigint",
			"b.Number": "number=123",
			"b['Number']": "number=123",
			"b[Number]": "",
			"'str'.concat()": "string=str",
			"'str'.concat('one')": "string=strone",
			"'str'.concat('one').concat('two')": "string=stronetwo",
			"'str'.concat('one').concat('two', 'three')": "string=stronetwothree",
			"'str'.concat('one', 'two')": "string=stronetwo",
			"'str'.concat('one', 'two').concat('three')": "string=stronetwothree",
			"'str'.concat('one', 'two').concat('three', 'four')":
				"string=stronetwothreefour",
			"'str'.concat('one', obj)": "wrapped=['str' string=str]+[null]",
			"'str'.concat('one', obj).concat()": "wrapped=['str' string=str]+[null]",
			"'str'.concat('one', obj, 'two')":
				"wrapped=['str' string=str]+['two' string=two]",
			"'str'.concat('one', obj, 'two').concat()":
				"wrapped=['str' string=str]+['two' string=two]",
			"'str'.concat('one', obj, 'two').concat('three')":
				"wrapped=['str' string=str]+['three' string=three]",
			"'str'.concat(obj)": "wrapped=['str' string=str]+[null]",
			"'str'.concat(obj).concat()": "wrapped=['str' string=str]+[null]",
			"'str'.concat(obj).concat('one', 'two')":
				"wrapped=['str' string=str]+['one', 'two' string=onetwo]",
			"'str'.concat(obj).concat(obj, 'one')":
				"wrapped=['str' string=str]+['one' string=one]",
			"'str'.concat(obj).concat(obj, 'one', 'two')":
				"wrapped=['str' string=str]+['one', 'two' string=onetwo]",
			"'str'.concat(obj).concat('one', obj, 'one')":
				"wrapped=['str' string=str]+['one' string=one]",
			"'str'.concat(obj).concat('one', obj, 'two', 'three')":
				"wrapped=['str' string=str]+['two', 'three' string=twothree]",
			"'str'.concat(obj, 'one')":
				"wrapped=['str' string=str]+['one' string=one]",
			"'str'.concat(obj, 'one').concat()":
				"wrapped=['str' string=str]+['one' string=one]",
			"'str'.concat(obj, 'one').concat('two', 'three')":
				"wrapped=['str' string=str]+['two', 'three' string=twothree]",
			"'str'.concat(obj, 'one').concat(obj, 'two', 'three')":
				"wrapped=['str' string=str]+['two', 'three' string=twothree]",
			"'str'.concat(obj, 'one').concat('two', obj, 'three')":
				"wrapped=['str' string=str]+['three' string=three]",
			"'str'.concat(obj, 'one').concat('two', obj, 'three', 'four')":
				"wrapped=['str' string=str]+['three', 'four' string=threefour]",
			"'str'.concat(obj, 'one', 'two')":
				"wrapped=['str' string=str]+['one', 'two' string=onetwo]",
			"'str'.concat(obj, 'one', 'two').concat()":
				"wrapped=['str' string=str]+['one', 'two' string=onetwo]",
			"'str'.concat(obj, 'one', 'two').concat('three', 'four')":
				"wrapped=['str' string=str]+['three', 'four' string=threefour]",
			"'str'.concat(obj, 'one', 'two').concat(obj, 'three', 'four')":
				"wrapped=['str' string=str]+['three', 'four' string=threefour]",
			"'str'.concat(obj, 'one', 'two').concat('three', obj, 'four')":
				"wrapped=['str' string=str]+['four' string=four]",
			"'str'.concat(obj, 'one', 'two').concat('three', obj, 'four', 'five')":
				"wrapped=['str' string=str]+['four', 'five' string=fourfive]",
			// eslint-disable-next-line no-template-curly-in-string
			"`start${obj}mid${obj2}end`":
				"template=[start string=start],[mid string=mid],[end string=end]",
			// eslint-disable-next-line no-template-curly-in-string
			"`start${'str'}mid${obj2}end`":
				// eslint-disable-next-line no-template-curly-in-string
				"template=[start${'str'}mid string=startstrmid],[end string=end]",
			// eslint-disable-next-line no-template-curly-in-string
			"`a${x}` === `b${x}`": "bool=false",
			// eslint-disable-next-line no-template-curly-in-string
			"`${x}a` === `${x}b`": "bool=false",
			// eslint-disable-next-line no-template-curly-in-string
			"`${a}${b}` === `a${b}`": "",
			// eslint-disable-next-line no-template-curly-in-string
			"`${a}${b}` === `${a}b`": "",
			"'abc'.slice(1)": "string=bc",
			"'abcdef'.slice(2, 5)": "string=cde",
			"'abcdef'.substring(2, 3)": "string=c",
			"'abcdef'.substring(2, 3, 4)": "",
			"'abc'[\"slice\"](1)": "string=bc",
			"'abc'[slice](1)": "",
			"'1,2+3'.split(/[,+]/)": "array=[1],[2],[3]",
			"'1,2+3'.split(expr)": "",
			"'a' + (expr + 'c')": "wrapped=['a' string=a]+['c' string=c]",
			"1 + 'a'": "string=1a",
			"'a' + 1": "string=a1",
			"'a' + expr + 1": "wrapped=['a' string=a]+[1 string=1]"
		};

		for (const key of Object.keys(testCases)) {
			/**
			 * @param {import("../lib/javascript/BasicEvaluatedExpression")} evalExpr eval expr
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
						`options=[${/** @type {import("../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.options).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isArray()) {
					result.push(
						`items=[${/** @type {import("../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.items).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isConstArray()) {
					result.push(
						`array=[${/** @type {(string | number | boolean | null | RegExp | bigint)[]} */ (evalExpr.array).join("],[")}]`
					);
				}
				if (evalExpr.isTemplateString()) {
					result.push(
						`template=[${/** @type {import("../lib/javascript/BasicEvaluatedExpression")[]} */ (evalExpr.quasis).map(evalExprToString).join("],[")}]`
					);
				}
				if (evalExpr.isWrapped()) {
					result.push(
						`wrapped=[${evalExprToString(/** @type {import("../lib/javascript/BasicEvaluatedExpression")} */ (evalExpr.prefix))}]+[${evalExprToString(
							/** @type {import("../lib/javascript/BasicEvaluatedExpression")} */ (
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
				const evalExpr = evaluateInParser(key);
				expect(evalExprToString(evalExpr)).toBe(
					/** @type {Record<string, string>} */ (testCases)[key]
						? `${key} ${/** @type {Record<string, string>} */ (testCases)[key]}`
						: key
				);
			});
		}
	});

	describe("async/await support", () => {
		describe("should accept", () => {
			const cases = {
				"async function": "async function x() {}",
				"async arrow function": "async () => {}",
				"await expression": "async function x(y) { await y }",
				"await iteration": "async function f() { for await (x of xs); }"
			};
			const parser = new JavascriptParser();
			for (const name of Object.keys(cases)) {
				const expr = /** @type {Record<string, string>} */ (cases)[name];

				it(name, () => {
					const actual = parser.parse(
						expr,
						/** @type {import("../lib/Parser").ParserState} */ (
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
						/** @type {import("../lib/Parser").ParserState} */ (
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
					const actual = JavascriptParser._parse(
						expr,
						/** @type {import("../lib/javascript/JavascriptParser").InternalParseOptions} */ (
							/** @type {unknown} */ ({})
						)
					);
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
				"const { a, ...rest } = { a: 1, b: 2 };",
				/** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);

			expect(definitions.has("a")).toBe(true);
			expect(definitions.has("rest")).toBe(true);
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
					const { ast } = JavascriptParser._parse(
						expr.code,
						/** @type {import("../lib/javascript/JavascriptParser").InternalParseOptions} */ ({
							ranges: true
						})
					);
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
		/** @type {import("../lib/Parser").ParserState} */
		const state = /** @type {EXPECTED_ANY} */ ({});

		it("still walks callee and arguments of defined-callee calls", () => {
			const parser = new JavascriptParser();
			/** @type {string[]} */
			const seen = [];
			parser.hooks.expression.for("marker").tap("Test", () => {
				seen.push("marker");
				return true;
			});
			parser.parse("function f(a){} f(marker);", state);
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
			parser.parse("function f(){} f();", state);
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
			parser.parse("function f(){} f();", state);
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
					/** @type {import("../lib/Parser").ParserState} */ (
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
		for (const source of [
			'new import.defer("x");',
			'new import.defer("x").prop;',
			'new import.defer("x").a.b;',
			'new import.source("x").prop;'
		]) {
			it(`rejects ${JSON.stringify(source)}`, () => {
				const err = parse(source);
				expect(err).toBeInstanceOf(SyntaxError);
				expect(/** @type {Error} */ (err).message).toMatch(
					/^import call cannot be the target of `new`/
				);
			});
		}

		// Parenthesized forms and non-`new` member access stay valid.
		for (const source of [
			'new (import.defer("x")).prop;',
			'import.defer("x").then(() => {});'
		]) {
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

		it("should fall back to `loc` without source text", () => {
			const parser = new JavascriptParser("module");
			const loc = {
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			};
			expect(parser.getLocation({ start: 0, end: 1, loc })).toBe(loc);
		});

		it("should fall back to `loc` for nodes without offsets", () => {
			const parser = parserFor("a;");
			const loc = {
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			};
			expect(parser.getLocation({ loc })).toBe(loc);
		});
	});

	describe("isAsiPosition derived from source", () => {
		/**
		 * @param {string} source source code
		 * @param {(parser: JavascriptParser, statement: EXPECTED_ANY) => void=} onStatement statement callback
		 * @returns {boolean[]} ASI answer at each top-level statement end
		 */
		function asiAtStatementEnds(source, onStatement) {
			const parser = new JavascriptParser("module");
			/** @type {boolean[]} */
			const result = [];
			parser.hooks.statement.tap("test", (statement) => {
				const statementPath =
					/** @type {import("../lib/javascript/JavascriptParser").StatementPath} */
					(parser.statementPath);
				// only top-level statements — the hook also fires for nested ones
				if (statementPath.length === 1) {
					if (onStatement) onStatement(parser, statement);
					result.push(
						parser.isAsiPosition(
							/** @type {import("../lib/javascript/JavascriptParser").Range} */
							(statement.range)[1]
						)
					);
				}
			});
			parser.parse(
				source,
				/** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({ source })
				)
			);
			return result;
		}

		it("should detect inserted semicolons without a semicolons set", () => {
			expect(asiAtStatementEnds("a\nb")).toEqual([true, true]);
			expect(asiAtStatementEnds("a;\nb;")).toEqual([false, false]);
			expect(asiAtStatementEnds("var x = {}\ny")).toEqual([true, true]);
			expect(asiAtStatementEnds("function f() {}\nx")).toEqual([false, true]);
			expect(asiAtStatementEnds("do x; while (y)")).toEqual([false]);
			expect(asiAtStatementEnds("l: while (a) b")).toEqual([true]);
			expect(asiAtStatementEnds("if (a) b\nelse c")).toEqual([true]);
		});

		it("should detect inserted semicolons for module statements", () => {
			expect(asiAtStatementEnds('import "x"')).toEqual([true]);
			expect(asiAtStatementEnds("export var x = 1")).toEqual([true]);
			expect(asiAtStatementEnds("export function f() {}")).toEqual([false]);
			expect(asiAtStatementEnds("const o = {};\nexport { o }")).toEqual([
				false,
				true
			]);
			expect(asiAtStatementEnds("export default 1")).toEqual([true]);
			expect(asiAtStatementEnds("export default function () {}")).toEqual([
				false
			]);
			expect(asiAtStatementEnds('export * from "x";')).toEqual([false]);
		});

		it("should mutate a provided semicolons set directly", () => {
			const parser = new JavascriptParser("module");
			parser.semicolons = new Set([5]);
			parser.setAsiPosition(7);
			parser.unsetAsiPosition(5);
			expect([...parser.semicolons]).toEqual([7]);
		});

		it("should honor setAsiPosition and unsetAsiPosition overrides", () => {
			expect(
				asiAtStatementEnds("a\nb", (parser, statement) =>
					parser.unsetAsiPosition(statement.range[1])
				)
			).toEqual([false, false]);
			expect(
				asiAtStatementEnds("a;\nb;", (parser, statement) =>
					parser.setAsiPosition(statement.range[1])
				)
			).toEqual([true, true]);
		});
	});
});
