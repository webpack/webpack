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

	describe("WebpackParser fast paths", () => {
		const { WebpackParser } = require("../lib/javascript/syntax");

		/**
		 * @param {string} source source code
		 * @returns {EXPECTED_ANY} program AST
		 */
		// `lazyNodes` is webpack's private extension of acorn's Options
		const parseOptions = /** @type {import("acorn").Options} */ (
			/** @type {unknown} */ ({ ecmaVersion: 2022, lazyNodes: true })
		);
		/**
		 * @param {string} source source code
		 * @returns {EXPECTED_ANY} program AST (loosely typed for node access)
		 */
		const parse = (source) =>
			/** @type {EXPECTED_ANY} */ (WebpackParser.parse(source, parseOptions));

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

		it("validates regexp flags from the precomputed whitelist", () => {
			expect(parse("/a/gimsy;").body[0].expression.regex.flags).toBe("gimsy");
			expect(() => parse("/a/q;")).toThrow(/Invalid regular expression flag/);
			expect(() => parse("/a/gg;")).toThrow(
				/Duplicate regular expression flag/
			);
			// `v` needs ES2024 — invalid at the pinned ecmaVersion 2022
			expect(() => parse("/a/v;")).toThrow(/Invalid regular expression flag/);
		});

		it("answers repeated ASI probes across a comment-holding gap", () => {
			// the newline scan memoizes into the tokenizer's flag; both outcomes
			const asi = parse("function f() { return /*\n*/ 1 }");
			expect(asi.body[0].body.body[0].argument).toBeNull();
			const noAsi = parse("function f() { return /* x */ 1 }");
			expect(noAsi.body[0].body.body[0].argument.value).toBe(1);
		});
	});

	describe("walk hook probing", () => {
		it("should fire expression hooks for tapped identifiers only", () => {
			const parser = new JavascriptParser("auto");
			/** @type {string[]} */
			const calls = [];
			parser.hooks.expression.for("tapped").tap("test", (expr) => {
				calls.push(/** @type {{ name: string }} */ (expr).name);
			});
			parser.parse(
				"tapped; untapped; tapped;",
				/** @type {import("../lib/Parser").ParserState} */ ({})
			);
			expect(calls).toEqual(["tapped", "tapped"]);
		});

		it("should serve members, optionals and ranges to expressionMemberChain taps", () => {
			const parser = new JavascriptParser("auto");
			/** @type {EXPECTED_ANY} */
			let seen;
			parser.hooks.expressionMemberChain
				.for("obj")
				.tap("test", (expr, members, membersOptionals, memberRanges) => {
					seen = {
						members: [...members],
						membersOptionals: [...membersOptionals],
						memberRanges: memberRanges.map((r) => [...r])
					};
					return true;
				});
			parser.parse(
				"obj.a?.b;",
				/** @type {import("../lib/Parser").ParserState} */ ({})
			);
			expect(seen.members).toEqual(["a", "b"]);
			expect(seen.membersOptionals).toEqual([false, true]);
			expect(seen.memberRanges).toEqual([
				[0, 3],
				[0, 5]
			]);
		});

		it("should keep extractMemberExpressionChain complete for direct callers", () => {
			const parser = new JavascriptParser("auto");
			/** @type {EXPECTED_ANY} */
			let chain;
			parser.hooks.statement.tap("test", (statement) => {
				if (statement.type === "ExpressionStatement") {
					chain = parser.extractMemberExpressionChain(
						/** @type {EXPECTED_ANY} */ (statement).expression
					);
				}
			});
			parser.parse(
				'a.b["c"];',
				/** @type {import("../lib/Parser").ParserState} */ ({})
			);
			expect(chain.members).toEqual(["c", "b"]);
			expect(chain.membersOptionals).toEqual([false, false]);
			expect(chain.memberRanges).toEqual([
				[0, 3],
				[0, 1]
			]);
			expect(chain.object.name).toBe("a");
		});
	});

	// The Phase D correctness gate (SOA_MIGRATION_PLAN.md): walking the SoA
	// facade tree must drive exactly the hook call sequence the object tree
	// drives, node for node.
	describe("SoA walk equivalence (hook sequences)", () => {
		const fs = require("fs");
		const path = require("path");
		const { SoaAst } = require("../lib/javascript/syntax");

		/**
		 * Over-approximates every identifier-ish word so the name-keyed
		 * HookMaps can be tapped exhaustively (keywords never fire).
		 * @param {string} code source
		 * @returns {Set<string>} candidate names
		 */
		const collectNames = (code) => {
			/** @type {Set<string>} */
			const names = new Set();
			for (const match of code.matchAll(/[$A-Z_a-z][$\w]*/g)) {
				names.add(match[0]);
			}
			return names;
		};

		/**
		 * Walks `code` with every walk-driven hook recording, and returns the
		 * event sequence.
		 * @param {string} code source
		 * @param {Set<string>} names names to tap on the name-keyed HookMaps
		 * @param {boolean} soaAst whether to emit into the column store
		 * @returns {{ events: string[], sawFacade: boolean }} recorded walk
		 */
		const recordWalk = (code, names, soaAst) => {
			const parser = new JavascriptParser("auto", { soaAst });
			/** @type {string[]} */
			const events = [];
			let sawFacade = false;
			/**
			 * @param {string} kind event label
			 * @returns {(node: EXPECTED_ANY) => void} recording tap
			 */
			const record = (kind) => (node) => {
				events.push(
					node && node.range
						? `${kind}:${node.type}@${node.range[0]}-${node.range[1]}`
						: `${kind}:${node && node.type}`
				);
			};
			parser.hooks.program.tap("test", (ast) => {
				events.push(`program:${ast.body.length}`);
				sawFacade = /** @type {EXPECTED_ANY} */ (ast).body.some(
					(/** @type {EXPECTED_ANY} */ s) =>
						SoaAst.isFacade(s) ||
						SoaAst.isFacade(s.source) ||
						(s.specifiers &&
							s.specifiers.some((/** @type {EXPECTED_ANY} */ sp) =>
								SoaAst.isFacade(sp)
							))
				);
			});
			parser.hooks.finish.tap("test", (ast) => {
				events.push(`finish:${ast.body.length}`);
			});
			parser.hooks.statement.tap("test", record("statement"));
			parser.hooks.statementIf.tap("test", record("if"));
			parser.hooks.importCall.tap("test", record("importCall"));
			parser.hooks.topLevelAwait.tap("test", record("topLevelAwait"));
			for (const name of names) {
				parser.hooks.expression.for(name).tap("test", record(`expr ${name}`));
				parser.hooks.call.for(name).tap("test", record(`call ${name}`));
				parser.hooks.new.for(name).tap("test", record(`new ${name}`));
				parser.hooks.expressionMemberChain
					.for(name)
					.tap("test", record(`chain ${name}`));
				parser.hooks.callMemberChain
					.for(name)
					.tap("test", record(`callChain ${name}`));
			}
			parser.parse(
				code,
				/** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			return { events, sawFacade };
		};

		/**
		 * @param {string} code source
		 * @returns {void} asserts both backends drive identical sequences
		 */
		const expectSameWalk = (code) => {
			const names = collectNames(code);
			const object = recordWalk(code, names, false);
			const soa = recordWalk(code, names, true);
			expect(object.sawFacade).toBe(false);
			expect(soa.sawFacade).toBe(true);
			expect(soa.events.length).toBeGreaterThan(0);
			// compare via join so a jest diff stays readable on mismatch
			expect(soa.events.join("\n")).toBe(object.events.join("\n"));
		};

		it("should drive identical hook sequences over the full grammar", () => {
			expectSameWalk(
				`import d, { a as b } from "m";
				import * as ns from "n";
				export const answer = 42;
				export { b as c };
				export default function named(p = 1, ...rest) { return p; }
				class K extends ns.Base {
					static #priv = 1;
					get g() { return super.x; }
					static { K.ready = true; }
					[d + "computed"](q) { new.target; return q ?? this; }
				}
				label: for (let i = 0, j = 10; i < j; i++) {
					if (i % 2) continue label;
					else if (i > 5) break label;
				}
				for (const k in ns) delete ns[k];
				for await (const v of ns.gen()) await v;
				while (b) do b--; while (b > 0);
				switch (d) { case 1: b(); break; default: ; }
				try { throw new Error("x"); } catch { debugger; } finally { }
				const { p = 1, ...restObj } = ns, [x, , ...ys] = [1, 2, 3];
				let t = \`a\${b}c\${d.e(1)}\`;
				t = tag\`only\${b}\`;
				b &&= d; b ||= d; b ??= d;
				(function iife() {})();
				(async () => { await import("dyn"); })();
				a.b?.c?.(); ns["computed"].deep;
				typeof b === "string" ? void 0 : ~x;
				obj: { b; }
				const re = /ab+c/gu, big = 12345678901234567890n;`
			);
		});

		// A non-pinned top level (no import/export/class at module scope) whose
		// statements the id-walk descends into, so the id-based walk core —
		// function/arrow bodies, block/if/while/do-while, return/throw,
		// array/spread/update and column-resolved identifiers — drives the run
		// rather than the object fallback.
		it("should drive identical hook sequences through the id-walk core", () => {
			// every id-native expression handler is a direct child of an id-native
			// statement (bare statement / return / array), never buried in a
			// still-fallback var declarator, so the id walk actually reaches it.
			expectSameWalk(
				`function outer(a, b, c) {
					if (a) b; else a;
					while (c) c--;
					do a++; while (a < 10);
					[a, b, , ...c];
					a++;
					--b;
					;
					debugger;
					(function rec(n) { return rec; });
					(function () {});
					(x => x + 1);
					(y => { return y; });
					1;
					a;
					return a;
				}
				function term(a) { return a; a(); }
				function pinned() { class C {} C; }
				function foreignChild() { return class {}; }
				[class {}];
				outer(1, 2, 3);
				term(4);
				pinned();
				foreignChild();
				var g = outer;
				g;
				\\u0067;
				throw g;`
			);
		});

		// The D2 expression cluster (member / call / new / binary / logical /
		// conditional / assignment / unary / sequence / object / template /
		// chain / yield), each reached as a direct child of an id-native
		// statement so the id walk descends into it rather than the object
		// fallback.
		it("should drive identical hook sequences through the D2 expression cluster", () => {
			expectSameWalk(
				`function d2(a, b, c) {
					a.b.c;
					a["b"].c;
					a.b?.c;
					a.b().c.d;
					foo(a, b.c, ...c);
					a.m(b, c);
					new a.b(c, d);
					new C();
					a + b * c - d;
					a && b || c;
					a ? b : c;
					a ? b.c : d.e;
					x = a;
					x = a.b;
					x.y = b;
					({ a } = c);
					[a, b] = c;
					x += a.b(c);
					typeof a;
					typeof a?.b;
					!a;
					delete a.b;
					(a, b, c);
					a(), b(c);
					({ a, b: c, [d]: e, m() {}, ...a });
					\`t\${a}u\${b.c}v\`;
					a?.b?.();
					return a.b(c);
				}
				function* g(a) { yield a; yield* a.b; return; }
				d2(1, 2, 3);
				g(4);
				this.x;
				[a.b, foo(c), a ? b : c, -a, a || b];`
			);
		});

		// Variable declarations id-walk their initializers, so the D2
		// expression handlers fire in their most common host (var/let/const
		// inits) both at a non-pinned top level and inside id-walked bodies.
		it("should drive identical hook sequences through variable declarations", () => {
			expectSameWalk(
				`var a = req("x"), b = a.b.c, c = a.m(b);
				let d = a ? b : c, e = { p: a, q: b.c };
				const f = a + b, g = h;
				var { x, y: z } = a, [p, ...q] = b;
				function uses(h) {
					var i = h.j(), k = new h.L(i);
					const m = i && k || h;
					let n = req(i);
					return n;
				}
				uses(a);`
			);
		});

		// Exercises the D2 handlers' hook-bail early returns (free-rooted
		// chains resolve member info; taps that return true stop the walk),
		// the strict-mode-in-module-output reports, and the foreign-pinned /
		// empty list fallbacks — all asserted equal across both backends.
		it("should match the object walk on D2 hook-bails and foreign-pinned lists", () => {
			/**
			 * @param {string} code source
			 * @param {boolean} soaAst backend
			 * @param {(parser: EXPECTED_ANY, events: string[]) => void} setup taps
			 * @param {"auto" | "script"} sourceType source type
			 * @param {boolean} moduleOutput emit as strict-mode module output
			 * @returns {string[]} recorded events
			 */
			const walk = (code, soaAst, setup, sourceType, moduleOutput) => {
				const parser = new JavascriptParser(sourceType, { soaAst });
				/** @type {string[]} */
				const events = [];
				setup(parser, events);
				const state = moduleOutput
					? {
							module: {
								addWarning: (/** @type {Error} */ w) =>
									events.push(`warn:${w.message}`),
								addError: (/** @type {Error} */ e) =>
									events.push(`err:${e.message}`)
							},
							compilation: { runtimeTemplate: { isModule: () => true } }
						}
					: {};
				parser.parse(
					code,
					/** @type {import("../lib/Parser").ParserState} */ (
						/** @type {unknown} */ (state)
					)
				);
				return events;
			};
			/**
			 * @param {string} code source
			 * @param {(parser: EXPECTED_ANY, events: string[]) => void} setup taps
			 * @param {("auto" | "script")=} sourceType source type
			 * @param {boolean=} moduleOutput strict-mode module output
			 * @returns {void} asserts both backends agree
			 */
			const same = (code, setup, sourceType = "auto", moduleOutput = false) => {
				expect(
					walk(code, true, setup, sourceType, moduleOutput).join("\n")
				).toBe(walk(code, false, setup, sourceType, moduleOutput).join("\n"));
			};
			/**
			 * @param {string[]} e events
			 * @param {string} label event label
			 * @returns {() => boolean} tap returning true
			 */
			const bail = (e, label) => () => {
				e.push(label);
				return true;
			};
			const noop = () => {};

			// member "expression": name hook bail, then member-chain hook bail
			same("free.a.b;", (p, e) => {
				p.hooks.expression.for("free.a.b").tap("t", bail(e, "expr"));
			});
			same("free.a.b;", (p, e) => {
				p.hooks.expressionMemberChain.for("free").tap("t", bail(e, "chain"));
			});
			// member "call": call-rooted chain, memberChainOfCallMemberChain bail
			same("free().a.b;", (p, e) => {
				p.hooks.memberChainOfCallMemberChain
					.for("free")
					.tap("t", bail(e, "mcocmc"));
			});
			// call: callMemberChainOfCallMemberChain / callMemberChain / call bails
			same("free().b();", (p, e) => {
				p.hooks.callMemberChainOfCallMemberChain
					.for("free")
					.tap("t", bail(e, "cmcocmc"));
			});
			same("free(1);", (p, e) => {
				p.hooks.callMemberChain.for("free").tap("t", bail(e, "callChain"));
			});
			same("free(1);", (p, e) => {
				p.hooks.call.for("free").tap("t", bail(e, "call"));
			});
			// call: import().then importCall bail; defined-plain-callee fast path
			same("import('x').then(free);", (p, e) => {
				p.hooks.importCall.tap("t", bail(e, "importCall"));
			});
			same("function f(a) { a; } f(free);", noop);
			// logical / conditional operator hooks returning a value
			same("free && other;", (p, e) => {
				p.hooks.expressionLogicalOperator.tap("t", () => {
					e.push("logical");
					return true;
				});
			});
			same("free ? a : b;", (p, e) => {
				p.hooks.expressionConditionalOperator.tap("t", () => {
					e.push("cond-true");
					return true;
				});
			});
			same("free ? a : b;", (p, e) => {
				p.hooks.expressionConditionalOperator.tap("t", () => {
					e.push("cond-false");
					return false;
				});
			});
			// typeof: direct bail and the optional-chain argument bail
			same("typeof free;", (p, e) => {
				p.hooks.typeof.for("free").tap("t", bail(e, "typeof"));
			});
			same("typeof free?.a;", (p, e) => {
				p.hooks.typeof.for("free.a").tap("t", bail(e, "typeofChain"));
			});
			// assignment: rename (kept / overridden) and assignMemberChain bail
			same("dst = free;", (p, e) => {
				p.hooks.canRename.for("free").tap("t", () => true);
			});
			same("dst = free;", (p, e) => {
				p.hooks.canRename.for("free").tap("t", () => true);
				p.hooks.rename.for("free").tap("t", bail(e, "rename"));
			});
			same("free.a = 1;", (p, e) => {
				p.hooks.assignMemberChain.for("free").tap("t", bail(e, "assignChain"));
			});
			// new hook bail
			same("new free();", (p, e) => {
				p.hooks.new.for("free").tap("t", bail(e, "new"));
			});
			// assignment: pattern targets and the plain member/other target tails
			same("[x] = free;", noop);
			same("({ y } = free);", noop);
			same("free.a = free.b;", noop);
			// strict-mode-in-module-output reports on the id walk
			same("delete free; und = 1; free = 1;", noop, "script", true);
			// call-rooted member descent, computed-member call, sequence not at
			// statement level, and empty / foreign-pinned lists
			same(
				// eslint-disable-next-line no-template-curly-in-string
				"free().a.b; free[key](1); z = (free.a, free.b); free(class {}); ({}); `t${class {}}u`; [free.m()];",
				noop
			);
		});

		it("should drive identical hook sequences for top-level and nested await", () => {
			expectSameWalk(
				`await x;
				async function af(p) { return await p; }
				af;`
			);
		});

		// The equivalence recorders return undefined, so the guarded and
		// result-driven `if` branches of the id walk need a plugin that returns a
		// value; assert the id and object walks still agree under it.
		it("should match the object walk on id-walk if-statement branches", () => {
			const code = "function f(a, b) { if (a) b; else a; }";
			/**
			 * @param {boolean} soaAst backend
			 * @param {(parser: EXPECTED_ANY, events: string[]) => void} setup taps
			 * @returns {string[]} recorded events
			 */
			const walkWith = (soaAst, setup) => {
				const parser = new JavascriptParser("auto", { soaAst });
				/** @type {string[]} */
				const events = [];
				setup(parser, events);
				parser.parse(
					code,
					/** @type {import("../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return events;
			};
			/**
			 * @param {(parser: EXPECTED_ANY, events: string[]) => void} setup taps
			 * @returns {void} asserts both backends agree
			 */
			const sameWith = (setup) => {
				expect(walkWith(true, setup).join("\n")).toBe(
					walkWith(false, setup).join("\n")
				);
			};
			/**
			 * @param {EXPECTED_ANY} value statementIf result or guard frame
			 * @param {boolean} guard tap collectGuards instead of statementIf
			 * @returns {(parser: EXPECTED_ANY, events: string[]) => void} setup
			 */
			const setup =
				(value, guard) =>
				(
					/** @type {EXPECTED_ANY} */ parser,
					/** @type {string[]} */ events
				) => {
					if (guard) {
						parser.hooks.collectGuards.tap("test", () => value);
					} else {
						parser.hooks.statementIf.tap("test", () => value);
					}
					parser.hooks.expression.for("a").tap("test", () => {
						events.push("a");
					});
					parser.hooks.expression.for("b").tap("test", () => {
						events.push("b");
					});
				};
			sameWith(setup(true, false)); // result truthy -> consequent only
			sameWith(setup(false, false)); // result falsy -> alternate only
			sameWith(setup({ consequent: {}, alternate: {} }, true)); // guarded branches
		});

		// Strict-mode-in-module-output diagnostics fire on the id walk for the
		// literal / function-params / arrow-params / update-target constructs,
		// each reached as a direct child of an id-native statement.
		it("should report the same strict-mode violations on both walks", () => {
			/**
			 * @param {boolean} soaAst backend
			 * @returns {string[]} sorted diagnostic messages
			 */
			const walk = (soaAst) => {
				// script (sloppy) source so legacy octal parses; the module output
				// then makes it a strict-mode violation at walk time
				const parser = new JavascriptParser("script", { soaAst });
				/** @type {string[]} */
				const messages = [];
				const state = /** @type {import("../lib/Parser").ParserState} */ (
					/** @type {unknown} */ ({
						module: {
							addWarning: (/** @type {Error} */ w) => messages.push(w.message),
							addError: (/** @type {Error} */ e) => messages.push(e.message)
						},
						compilation: {
							runtimeTemplate: { isModule: () => true }
						}
					})
				);
				parser.parse(
					`07;
					function f(a, a) { return a; }
					(eval => eval);
					undefined++;`,
					state
				);
				return messages.sort();
			};
			const soa = walk(true);
			expect(soa).toEqual(walk(false));
			expect(soa.length).toBeGreaterThan(0);
		});

		// A `terminate` tap flips `scope.terminated`, exercising the id walk's
		// return/throw terminate path and the following-statement skip.
		it("should set scope.terminated via the terminate hook on both walks", () => {
			/**
			 * @param {boolean} soaAst backend
			 * @param {string} keyword `return` or `throw`
			 * @returns {string[]} recorded events
			 */
			const walk = (soaAst, keyword) => {
				const parser = new JavascriptParser("auto", { soaAst });
				/** @type {string[]} */
				const events = [];
				parser.hooks.terminate.tap("test", () => true);
				parser.hooks.unusedStatement.tap("test", () => true);
				parser.hooks.expression.for("after").tap("test", () => {
					events.push("after");
				});
				parser.parse(
					`function f(a) { ${keyword} a; after; }`,
					/** @type {import("../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return events;
			};
			for (const keyword of ["return", "throw"]) {
				expect(walk(true, keyword)).toEqual(walk(false, keyword));
				// the terminated scope marks `after;` unused, so it is skipped
				expect(walk(true, keyword)).not.toContain("after");
			}
			// an `if` whose both branches terminate marks the whole `if` terminated
			/**
			 * @param {boolean} soaAst backend
			 * @returns {string[]} recorded events
			 */
			const bothWalk = (soaAst) => {
				const parser = new JavascriptParser("auto", { soaAst });
				/** @type {string[]} */
				const events = [];
				parser.hooks.terminate.tap("test", () => true);
				parser.hooks.unusedStatement.tap("test", () => true);
				parser.hooks.expression.for("after").tap("test", () => {
					events.push("after");
				});
				parser.parse(
					"function f(a) { if (a) return a; else return a; after; }",
					/** @type {import("../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return events;
			};
			expect(bothWalk(true)).toEqual(bothWalk(false));
			expect(bothWalk(true)).not.toContain("after");
		});

		it("should honor a statement-hook bail on the id walk", () => {
			/**
			 * @param {boolean} soaAst backend
			 * @returns {string[]} recorded events
			 */
			const walk = (soaAst) => {
				const parser = new JavascriptParser("auto", { soaAst });
				/** @type {string[]} */
				const events = [];
				parser.hooks.statement.tap("test", (s) => {
					events.push(s.type);
					if (s.type === "ExpressionStatement") return true;
				});
				parser.hooks.expression.for("inner").tap("test", () => {
					events.push("inner");
				});
				parser.parse(
					"function f() { inner; }",
					/** @type {import("../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				return events;
			};
			expect(walk(true)).toEqual(walk(false));
			// the ExpressionStatement bail prevents the inner identifier walk
			expect(walk(true)).not.toContain("inner");
		});

		for (const [name, read] of [
			[
				"react.development.js",
				() =>
					fs.readFileSync(
						path.join(
							path.dirname(require.resolve("react/package.json")),
							"cjs/react.development.js"
						),
						"utf8"
					)
			],
			[
				"lodash.js",
				() =>
					fs.readFileSync(
						path.join(
							path.dirname(require.resolve("lodash/package.json")),
							"lodash.js"
						),
						"utf8"
					)
			]
		]) {
			it(`should drive identical hook sequences over ${name}`, () => {
				expectSameWalk(/** @type {() => string} */ (read)());
			}, 120000);
		}
	});
});
