"use strict";

const BasicEvaluatedExpression = require("../lib/javascript/BasicEvaluatedExpression");
const JavascriptParser = require("../lib/javascript/JavascriptParser");

describe("JavascriptParser", () => {
	/* eslint-disable no-undef */
	/* eslint-disable no-unused-vars */
	/* eslint-disable no-inner-declarations */
	const testCases = {
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
				test[memberExpr];
				test[+memberExpr];
			},
			{
				expressions: ["memberExpr", "memberExpr"]
			}
		],
		"in function definition": [
			function () {
				(function (abc, cde, fgh) {
					abc("test");
					cde.abc("test");
					cde.ddd.abc("test");
					fgh;
					fgh.sub;
				})();
			},
			{}
		],
		"const definition": [
			function () {
				let abc, cde, fgh;
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
				fgh.sub;
			},
			{}
		],
		"var definition": [
			function () {
				var abc, cde, fgh;
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
				fgh.sub;
			},
			{}
		],
		"function definition": [
			function () {
				function abc() {}

				function cde() {}

				function fgh() {}
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
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

					function test(ttt) {
						fgh.sub;
						fgh;
					}
				} catch (e) {
					fgh.sub;
					fgh;
				}
			},
			{
				fghsub: ["try", "notry", "notry"],
				fgh: ["test", "test ttt", "test e"]
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
				var xyz = abc;
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
				!function () {
					this.sub;
				}.call(ijk);
			},
			{
				ijksub: ["test"]
			}
		],
		"renaming this's properties with nested IIFE (called)": [
			function () {
				!function () {
					!function () {
						this.sub;
					}.call(this);
				}.call(ijk);
			},
			{
				ijksub: ["test"]
			}
		],
		"new Foo(...)": [
			function () {
				new xyz("membertest");
			},
			{
				xyz: ["membertest"]
			}
		],
		"spread calls/literals": [
			function () {
				var xyz = [...abc("xyz"), cde];
				Math.max(...fgh);
			},
			{
				abc: ["xyz"],
				fgh: ["xyz"]
			}
		]
	};
	/* eslint-enable no-undef */
	/* eslint-enable no-unused-vars */
	/* eslint-enable no-inner-declarations */

	Object.keys(testCases).forEach(name => {
		it("should parse " + name, () => {
			let source = testCases[name][0].toString();
			source = source.substr(13, source.length - 14).trim();
			const state = testCases[name][1];

			const testParser = new JavascriptParser({});
			testParser.hooks.canRename
				.for("abc")
				.tap("JavascriptParserTest", expr => true);
			testParser.hooks.canRename
				.for("ijk")
				.tap("JavascriptParserTest", expr => true);
			testParser.hooks.call.for("abc").tap("JavascriptParserTest", expr => {
				if (!testParser.state.abc) testParser.state.abc = [];
				testParser.state.abc.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			testParser.hooks.call.for("cde.abc").tap("JavascriptParserTest", expr => {
				if (!testParser.state.cdeabc) testParser.state.cdeabc = [];
				testParser.state.cdeabc.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			testParser.hooks.call
				.for("cde.ddd.abc")
				.tap("JavascriptParserTest", expr => {
					if (!testParser.state.cdedddabc) testParser.state.cdedddabc = [];
					testParser.state.cdedddabc.push(
						testParser.parseString(expr.arguments[0])
					);
					return true;
				});
			testParser.hooks.expression
				.for("fgh")
				.tap("JavascriptParserTest", expr => {
					if (!testParser.state.fgh) testParser.state.fgh = [];
					testParser.state.fgh.push(
						Array.from(testParser.scope.definitions.asSet()).join(" ")
					);
					return true;
				});
			testParser.hooks.expression
				.for("fgh.sub")
				.tap("JavascriptParserTest", expr => {
					if (!testParser.state.fghsub) testParser.state.fghsub = [];
					testParser.state.fghsub.push(
						testParser.scope.inTry ? "try" : "notry"
					);
					return true;
				});
			testParser.hooks.expression
				.for("ijk.sub")
				.tap("JavascriptParserTest", expr => {
					if (!testParser.state.ijksub) testParser.state.ijksub = [];
					testParser.state.ijksub.push("test");
					return true;
				});
			testParser.hooks.expression
				.for("memberExpr")
				.tap("JavascriptParserTest", expr => {
					if (!testParser.state.expressions) testParser.state.expressions = [];
					testParser.state.expressions.push(expr.name);
					return true;
				});
			testParser.hooks.new.tap("xyz", "JavascriptParserTest", expr => {
				if (!testParser.state.xyz) testParser.state.xyz = [];
				testParser.state.xyz.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			const actual = testParser.parse(source, {});
			expect(typeof actual).toBe("object");
			expect(actual).toEqual(state);
		});
	});

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

		const testParser = new JavascriptParser({});

		testParser.hooks.program.tap("JavascriptParserTest", (ast, comments) => {
			if (!testParser.state.comments) testParser.state.comments = comments;
			return true;
		});

		const actual = testParser.parse(source, {});
		expect(typeof actual).toBe("object");
		expect(typeof actual.comments).toBe("object");
		actual.comments.forEach((element, index) => {
			expect(typeof element.type).toBe("string");
			expect(typeof element.value).toBe("string");
			expect(element.type).toBe(state[index].type);
			expect(element.value).toBe(state[index].value);
		});
	});

	describe("expression evaluation", () => {
		function evaluateInParser(source) {
			const parser = new JavascriptParser();
			parser.hooks.call.for("test").tap("JavascriptParserTest", expr => {
				parser.state.result = parser.evaluateExpression(expr.arguments[0]);
			});
			parser.hooks.evaluateIdentifier
				.for("aString")
				.tap("JavascriptParserTest", expr =>
					new BasicEvaluatedExpression()
						.setString("aString")
						.setRange(expr.range)
				);
			parser.hooks.evaluateIdentifier
				.for("b.Number")
				.tap("JavascriptParserTest", expr =>
					new BasicEvaluatedExpression().setNumber(123).setRange(expr.range)
				);
			return parser.parse("test(" + source + ");", {}).result;
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
			"'abc'.substr(1)": "string=bc",
			"'abcdef'.substr(2, 3)": "string=cde",
			"'abcdef'.substring(2, 3)": "string=c",
			"'abcdef'.substring(2, 3, 4)": "",
			"'abc'[\"substr\"](1)": "string=bc",
			"'abc'[substr](1)": "",
			"'1,2+3'.split(/[,+]/)": "array=[1],[2],[3]",
			"'1,2+3'.split(expr)": "",
			"'a' + (expr + 'c')": "wrapped=['a' string=a]+['c' string=c]",
			"1 + 'a'": "string=1a",
			"'a' + 1": "string=a1",
			"'a' + expr + 1": "wrapped=['a' string=a]+[1 string=1]"
		};

		Object.keys(testCases).forEach(key => {
			function evalExprToString(evalExpr) {
				if (!evalExpr) {
					return "null";
				} else {
					const result = [];
					if (evalExpr.isString()) result.push("string=" + evalExpr.string);
					if (evalExpr.isNumber()) result.push("number=" + evalExpr.number);
					if (evalExpr.isBigInt()) result.push("bigint=" + evalExpr.bigint);
					if (evalExpr.isBoolean()) result.push("bool=" + evalExpr.bool);
					if (evalExpr.isRegExp()) result.push("regExp=" + evalExpr.regExp);
					if (evalExpr.isConditional())
						result.push(
							"options=[" +
								evalExpr.options.map(evalExprToString).join("],[") +
								"]"
						);
					if (evalExpr.isArray())
						result.push(
							"items=[" + evalExpr.items.map(evalExprToString).join("],[") + "]"
						);
					if (evalExpr.isConstArray())
						result.push("array=[" + evalExpr.array.join("],[") + "]");
					if (evalExpr.isTemplateString())
						result.push(
							"template=[" +
								evalExpr.quasis.map(evalExprToString).join("],[") +
								"]"
						);
					if (evalExpr.isWrapped())
						result.push(
							"wrapped=[" +
								evalExprToString(evalExpr.prefix) +
								"]+[" +
								evalExprToString(evalExpr.postfix) +
								"]"
						);
					if (evalExpr.range) {
						const start = evalExpr.range[0] - 5;
						const end = evalExpr.range[1] - 5;
						return (
							key.substr(start, end - start) +
							(result.length > 0 ? " " + result.join(" ") : "")
						);
					}
					return result.join(" ");
				}
			}

			it("should eval " + key, () => {
				const evalExpr = evaluateInParser(key);
				expect(evalExprToString(evalExpr)).toBe(
					testCases[key] ? key + " " + testCases[key] : key
				);
			});
		});
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
			Object.keys(cases).forEach(name => {
				const expr = cases[name];
				it(name, () => {
					const actual = parser.parse(expr, {});
					expect(typeof actual).toBe("object");
				});
			});
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
			parser.hooks.call.for("require").tap("JavascriptParserTest", expr => {
				const param = parser.evaluateExpression(expr.arguments[0]);
				parser.state.param = param.string;
			});
			parser.hooks.importCall.tap("JavascriptParserTest", expr => {
				const param = parser.evaluateExpression(expr.source);
				parser.state.param = param.string;
			});

			Object.keys(cases).forEach(name => {
				it(name, () => {
					const actual = parser.parse(cases[name][0], {});
					expect(actual).toEqual(cases[name][1]);
				});
			});
		});
	});

	describe("object rest/spread support", () => {
		describe("should accept", () => {
			const cases = {
				"object spread": "({...obj})",
				"object rest": "({...obj} = foo)"
			};
			Object.keys(cases).forEach(name => {
				const expr = cases[name];
				it(name, () => {
					const actual = JavascriptParser._parse(expr, {});
					expect(typeof actual).toBe("object");
				});
			});
		});

		it("should collect definitions from identifiers introduced in object patterns", () => {
			let definitions;

			const parser = new JavascriptParser();

			parser.hooks.statement.tap("JavascriptParserTest", expr => {
				definitions = parser.scope.definitions;
				return true;
			});

			parser.parse("const { a, ...rest } = { a: 1, b: 2 };", {});

			expect(definitions.has("a")).toBe(true);
			expect(definitions.has("rest")).toBe(true);
		});
	});

	describe("optional catch binding support", () => {
		describe("should accept", () => {
			const cases = {
				"optional binding": "try {} catch {}"
			};
			Object.keys(cases).forEach(name => {
				const expr = cases[name];
				it(name, () => {
					const actual = JavascriptParser._parse(expr);
					expect(typeof actual).toBe("object");
				});
			});
		});
	});

	describe("BasicEvaluatedExpression", () => {
		/** @type [string, boolean][] */
		const tests = [
			...["i", "g", "m", "y"].reduce((acc, flag) => {
				acc.push([flag, true]);
				acc.push([flag + flag, false]);
				return acc;
			}, []),
			["", true],
			["igm", true],
			["igmy", true],
			["igmyi", false],
			["igmya", false],
			["ai", false],
			["ia", false]
		];

		tests.forEach(([suite, expected]) => {
			it(`BasicEvaluatedExpression.isValidRegExpFlags(${JSON.stringify(
				suite
			)})`, () => {
				expect(BasicEvaluatedExpression.isValidRegExpFlags(suite)).toBe(
					expected
				);
			});
		});
	});
});
