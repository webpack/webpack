"use strict";

/* eslint-disable no-unused-expressions, no-unassigned-vars, func-names */

// cspell:ignore fghsub notry fghsub notry notry this's ijksub this's ijksub fghsub fghsub notry ijksub ijksub strrring strrring strr strrring strrring strr Sstrrringy strone stronetwo stronetwothree stronetwo stronetwothree stronetwothreefour onetwo onetwo twothree twothree twothree threefour onetwo onetwo threefour threefour fourfive startstrmid igmy igmyi igmya
const BasicEvaluatedExpression = require("../../lib/javascript/BasicEvaluatedExpression");
const JavascriptParser = require("../../lib/javascript/JavascriptParser");
const {
	BLOCK_DECLARATIONS,
	HOISTED_DECLARATIONS,
	MODULE_DECLARATIONS,
	parse: parseModule
} = require("../../lib/javascript/syntax-parser");

/** @import { ImportDeclaration } from "estree" */

describe("JavascriptParser", () => {
	describe("strict directive spelling", () => {
		it.each([
			['"use strict";', true],
			["'use strict';", true],
			['"custom"; "use strict";', true],
			['""; "custom"; "use strict"; "use strict";', true],
			['0; "use strict";', false],
			['("custom"); "use strict";', false],
			['"custom"; "use\\x20strict";', false],
			['("use strict");', false],
			['"use\\x20strict";', false],
			['"use \\\nstrict";', false]
		])("detects the mode of %s", (directive, expected) => {
			for (const source of [
				`${directive} probe();`,
				`function test() { ${directive} probe(); }`
			]) {
				const parser = new JavascriptParser("script");
				/** @type {boolean[]} */
				const modes = [];
				parser.hooks.call.for("probe").tap("test", () => {
					modes.push(parser.scope.isStrict);
				});
				parser.parse(
					source,
					/** @type {import("../../lib/module/Parser").ParserState} */ (
						/** @type {unknown} */ ({})
					)
				);
				expect(modes).toEqual([expected]);
			}
		});

		it.each([
			['"use strict";', true],
			['"custom";', false]
		])("reads %s from an AST that states no directive", (directive, expected) => {
			const source = `${directive} probe();`;
			const parser = new JavascriptParser("script");
			const state =
				/** @type {import("../../lib/module/Parser").ParserState} */
				(/** @type {unknown} */ ({ source }));
			/** @type {EXPECTED_ANY} */
			let ast;
			parser.hooks.program.tap("test", (program) => {
				ast = program;
			});
			parser.parse(source, state);
			// a parser of the caller's own may report a directive as a plain
			// expression statement, and may carry no raw text either
			for (const statement of ast.body) {
				statement.directive = undefined;
				if (statement.expression) statement.expression.raw = undefined;
			}
			ast.comments = [];
			/** @type {boolean[]} */
			const modes = [];
			parser.hooks.call.for("probe").tap("test", () => {
				modes.push(parser.scope.isStrict);
			});
			parser.parse(ast, state);
			expect(modes).toEqual([expected]);
		});
	});

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
				/** @type {import("../../lib/module/Parser").ParserState} */ (
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
		 * @param {string} source source
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
				`test(${source});`,
				/** @type {import("../../lib/module/Parser").ParserState} */ (
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
					const actual = JavascriptParser._parse(
						expr,
						/** @type {import("../../lib/javascript/JavascriptParser").InternalParseOptions} */ (
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
				"",
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
					const { ast } = JavascriptParser._parse(
						expr.code,
						/** @type {import("../../lib/javascript/JavascriptParser").InternalParseOptions} */ ({
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

	describe("import source declarations", () => {
		/**
		 * @param {string} source source
		 * @returns {string} the phase and the local names it binds
		 */
		function phaseAndBindings(source) {
			const ast = parseModule(source, {
				sourceType: "module",
				ecmaVersion: "latest",
				importPhases: true
			});
			return ast.body
				.map((node) => {
					const declaration =
						/** @type {ImportDeclaration & { phase?: string }} */
						(node);
					return `${declaration.phase || "evaluation"}:${declaration.specifiers
						.map((specifier) => specifier.local.name)
						.join(",")}`;
				})
				.join(" ");
		}

		// `source` and `from` are contextual, so which one is the phase and which
		// the binding takes a look-ahead past the first `from`.
		const cases = [
			['import source x from "m";', "source:x"],
			['import source source from "m";', "source:source"],
			['import source from from "m";', "source:from"],
			['import source from "m";', "evaluation:source"],
			['import source, { a } from "m";', "evaluation:source,a"],
			['import source /* c */ from /* c */ from "m";', "source:from"],
			[
				'import source source from "a";\nimport source from from "b";',
				"source:source source:from"
			]
		];

		for (const [source, expected] of cases) {
			it(`parses ${JSON.stringify(source)}`, () => {
				expect(phaseAndBindings(source)).toBe(expected);
			});
		}

		// A name that merely starts with `from` is a binding, not the clause.
		for (const source of [
			'import source from fromage from "m";',
			'import source from from from "m";'
		]) {
			it(`rejects ${JSON.stringify(source)}`, () => {
				expect(() => phaseAndBindings(source)).toThrow(SyntaxError);
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

		// `buildLineStarts` serves LF-only and CRLF sources from a native
		// `indexOf` search and everything else from the char-code fallback —
		// both paths must agree with acorn's `lineBreak` semantics.
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

		it("should reuse the line table across calls", () => {
			const parser = parserFor("a;\nbb;\n");
			expect(parser.getLocation({ start: 0, end: 1 })).toEqual({
				start: { line: 1, column: 0 },
				end: { line: 1, column: 1 }
			});
			const lineStarts = parser._lineStarts;
			expect(lineStarts).toEqual([0, 3, 7]);
			expect(parser.getLocation({ start: 4, end: 5 })).toEqual({
				start: { line: 2, column: 1 },
				end: { line: 2, column: 2 }
			});
			expect(parser._lineStarts).toBe(lineStarts);
		});
	});

	describe("hoisted declarations", () => {
		const EVERY_POSITION = `
var top = 1;
function topFunction() {}
class TopClass {}
if (top) { var fromIf = 1; } else { var fromElse = 2; }
for (var fromFor = 0; fromFor < 1; fromFor++) { var fromForBody = 1; }
for (var fromForIn in top) { var fromForInBody = 1; }
for (var fromForOf of [top]) { var fromForOfBody = 1; }
while (top) { var fromWhile = 1; }
do { var fromDoWhile = 1; } while (top);
label: { var fromLabeled = 1; }
with (top) { var fromWith = 1; }
try { var fromTry = 1; } catch (error) { var fromCatch = 1; } finally { var fromFinally = 1; }
switch (top) { case 1: var fromCase = 1; break; default: var fromDefault = 1; }
{ var fromBlock = 1; function blockFunction() {} }
let lexical = 1;
const alsoLexical = 1;
function outer() { var inOuter = 1; }
`;

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
			const { ast, comments } = JavascriptParser._parse(EVERY_POSITION, {
				sourceType: "script",
				ranges: true,
				comments: true
			});
			// strip the parser's record: what a preparsed AST from a loader looks
			// like, and the only thing that separates the two paths
			/** @type {EXPECTED_ANY} */
			(ast)[HOISTED_DECLARATIONS] = undefined;
			/** @type {EXPECTED_ANY} */
			(ast)[MODULE_DECLARATIONS] = undefined;
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(hoistedNames(ast)).toEqual(hoistedNames(EVERY_POSITION));
		});

		it("walks every statement again for a tap that expects them", () => {
			const source =
				"debugger;\nfunction outer() { if (outer) { debugger; } }";
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
			const sparse = `
var target;
try { var fromTryOnly = 1; } finally { }
try { var fromTryCaught = 1; } catch (error) { }
for (; target; ) { var fromBareFor = 1; }
for (target in { }) { var fromForInTarget = 1; }
for (target of [ ]) { var fromForOfTarget = 1; }
`;
			expect(hoistedNames(sparse, "script", true)).toEqual(
				hoistedNames(sparse)
			);
			expect(hoistedNames(sparse)).toContain("fromForOfTarget");
		});

		it("records the program's imports and re-exports, and nothing else", () => {
			const { ast } = JavascriptParser._parse(
				"import a from './a';\nexport * from './b';\nexport { a };\nexport default 1;\nvar plain = 1;\nif (plain) { var nested = 1; }",
				{ sourceType: "module", ranges: true, comments: true }
			);
			expect(
				/** @type {EXPECTED_ANY} */ (ast)[MODULE_DECLARATIONS].filter(
					(/** @type {EXPECTED_ANY} */ _entry, /** @type {number} */ index) =>
						index % 2 === 0
				).map((/** @type {EXPECTED_ANY} */ declaration) => declaration.type)
			).toEqual([
				"ImportDeclaration",
				"ExportAllDeclaration",
				"ExportNamedDeclaration"
			]);
		});

		it("reports the statement written before each module declaration", () => {
			// removing a module declaration can join the statements around it
			// through ASI, so what precedes it decides whether a `;` is needed
			const source =
				"const num = 1\n\nexport { a } from './a';\nimport b from './b';";
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
				"import a from './a';\nvar plain = 1;\nexport * from './b';";
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
				"import a from './a';\nexport * from './b';\nexport { a };\nexport default 1;";
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
			const { ast, comments } = JavascriptParser._parse(source, {
				sourceType: "module",
				ranges: true,
				comments: true
			});
			/** @type {EXPECTED_ANY} */
			(ast)[MODULE_DECLARATIONS] = undefined;
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(reported(ast)).toEqual(reported(source));
			expect(reported(source)).toContain("import ./a");
		});

		it("ignores the record of an AST handed to it, which may have been edited", () => {
			const { ast, comments } = JavascriptParser._parse("var first = 1;", {
				sourceType: "script",
				ranges: true,
				comments: true
			});
			const { ast: spliced } = JavascriptParser._parse("var second = 2;", {
				sourceType: "script",
				ranges: true,
				comments: true
			});
			// a loader may hand back a tree it changed after it was read, so the
			// record the parse left on it no longer says what the tree declares
			/** @type {EXPECTED_ANY} */
			(ast).body.push(/** @type {EXPECTED_ANY} */ (spliced).body[0]);
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(hoistedNames(ast)).toEqual(["first", "second"]);
		});

		it("keeps no record when a plugin owns a production that records", () => {
			const source = "class Declared {}\nvar plain = 1;\nfunction named() {}";
			const { WebpackParser } = require("../../lib/javascript/syntax-parser");
			const options = {
				ecmaVersion: 2022,
				lazyNodes: true,
				ranges: true,
				sourceType: "script"
			};
			const recorded = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					source,
					/** @type {EXPECTED_ANY} */ (/** @type {unknown} */ (options))
				)
			);
			expect(recorded[HOISTED_DECLARATIONS]).toBeDefined();

			// a subclass reading a class itself never reaches `_recordHoisted`, so
			// the record would be short by every class it read
			const Subclass = /** @type {EXPECTED_ANY} */ (WebpackParser).extend(
				(/** @type {EXPECTED_ANY} */ Parser) =>
					class extends Parser {
						/**
						 * @param {EXPECTED_ANY} node the class node
						 * @param {EXPECTED_ANY} isStatement whether it is a declaration
						 * @returns {EXPECTED_ANY} the finished class
						 */
						parseClass(node, isStatement) {
							return super.parseClass(node, isStatement);
						}
					}
			);
			const extended = /** @type {EXPECTED_ANY} */ (
				Subclass.parse(
					source,
					/** @type {EXPECTED_ANY} */ (/** @type {unknown} */ (options))
				)
			);
			expect(extended[HOISTED_DECLARATIONS]).toBeUndefined();
		});

		it("keeps no module record when a plugin reads imports or exports", () => {
			const source = "import a from './a';\nexport * from './b';";
			const { WebpackParser } = require("../../lib/javascript/syntax-parser");
			const options = {
				ecmaVersion: 2022,
				lazyNodes: true,
				ranges: true,
				sourceType: "module"
			};
			// a subclass reading an export itself never reaches the recording
			// site, so the list would be short by every export it read
			const Subclass = /** @type {EXPECTED_ANY} */ (WebpackParser).extend(
				(/** @type {EXPECTED_ANY} */ Parser) =>
					class extends Parser {
						/**
						 * @param {EXPECTED_ANY} node the export node
						 * @param {EXPECTED_ANY} exports where exports are tracked
						 * @returns {EXPECTED_ANY} the finished export
						 */
						parseExport(node, exports) {
							return super.parseExport(node, exports);
						}
					}
			);
			const extended = /** @type {EXPECTED_ANY} */ (
				Subclass.parse(
					source,
					/** @type {EXPECTED_ANY} */ (/** @type {unknown} */ (options))
				)
			);
			expect(extended[MODULE_DECLARATIONS]).toBeUndefined();
		});

		it("records only the declarations the program itself states", () => {
			const { WebpackParser } = require("../../lib/javascript/syntax-parser");
			// the option lets an import stand where no program states it, which
			// is the one way a declaration reaches the record from a scope below
			const program = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					"import a from './a';\n{ import b from './b'; }",
					/** @type {EXPECTED_ANY} */ (
						/** @type {unknown} */ ({
							allowImportExportEverywhere: true,
							ecmaVersion: 2022,
							lazyNodes: true,
							ranges: true,
							sourceType: "module"
						})
					)
				)
			);
			expect(
				program[MODULE_DECLARATIONS].filter(
					(/** @type {EXPECTED_ANY} */ _entry, /** @type {number} */ index) =>
						index % 2 === 0
				).map(
					(/** @type {EXPECTED_ANY} */ declaration) =>
						declaration.source.value
				)
			).toEqual(["./a"]);
		});

		it("keeps a declaration under an `export` head out of the scope's list", () => {
			// the export statement reports its own declaration, so listing it
			// again would declare it twice
			expect(
				hoistedNames(
					"export var exported = 1; export function exportedFunction() {} var plain = 1;",
					"module"
				)
			).toEqual(["plain", "exported", "exportedFunction"]);
		});
	});

	describe("block declarations", () => {
		const EVERY_POSITION = `
const top = 1;
let alsoTop = 2;
({ top: alsoTop } = { top: 1 });
using alsoUsing = { [Symbol.dispose]() {} };
class TopClass {}
export const exported = 3;
export default class DefaultClass {}
{ const inBlock = 4; class InBlock {} }
if (top) { let inIf = 5; } else { const inElse = 6; }
for (const inFor of [top]) { let inForOfBody = 7; }
for (let index = 0; index < 1; index++) { const inForBody = 8; }
for (const key in {}) { let inForInBody = 9; }
while (top) { const inWhile = 10; }
do { let inDoWhile = 11; } while (top);
label: { const inLabeled = 12; }
try { const inTry = 13; } catch (error) { let inCatch = 14; } finally { const inFinally = 15; }
switch (top) { case 1: { const inCaseBlock = 16; } case 2: let inCase = 17; break; default: const inDefault = 18; }
function fn() { const inFunction = 19; }
class WithStatic { static { const inStaticBlock = 20; } }
`;

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
			const { ast, comments } = JavascriptParser._parse(EVERY_POSITION, {
				sourceType: "module",
				ranges: true,
				comments: true
			});
			// strip the parser's record: what a preparsed AST from a loader looks
			// like, and the only thing that separates the two paths
			const strip = (/** @type {EXPECTED_ANY} */ node) => {
				if (node === null || typeof node !== "object") return;
				if (Array.isArray(node)) {
					for (const item of node) strip(item);
					return;
				}
				node[BLOCK_DECLARATIONS] = undefined;
				node[HOISTED_DECLARATIONS] = undefined;
				node[MODULE_DECLARATIONS] = undefined;
				for (const key of Object.keys(node)) strip(node[key]);
			};
			strip(ast);
			/** @type {EXPECTED_ANY} */
			(ast).comments = comments;
			expect(blockNames(ast)).toEqual(blockNames(EVERY_POSITION));
		});

		it("reports the statement written before each declaration", () => {
			// removing an `export` can join the statements around it through ASI,
			// so what precedes it decides whether a `;` is needed
			const source =
				"const num = 1\nfunction gap() {}\ndebugger;\nexport { num };";
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
			const source = "const obj = { a: 1, b: 2 };\nlet a, b;\n({ a, b } = obj);";
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

		it("keeps an index too large for the mask in a list of its own", () => {
			const { BLOCK_DECLARATIONS: SLOT, MAX_MASKED_INDEX } = require(
				"../../lib/javascript/syntax-parser"
			);
			// a mask is one 31-bit number, so an index it cannot hold must reach the
			// fallback: `1 << 32` is `1 << 0`, which would claim the wrong statement
			expect(MAX_MASKED_INDEX).toBeLessThan(31);
			// the filler is fixed rather than derived from the bound above, so a
			// bound raised past what a mask holds fails this case
			const filler = "void 0;\n".repeat(40);
			const source = `const early = 1;\n${filler}const late = 2;`;
			const { ast } = JavascriptParser._parse(source, {
				sourceType: "module",
				ranges: true,
				comments: true
			});
			const recorded = /** @type {EXPECTED_ANY} */ (ast)[SLOT];
			expect(Array.isArray(recorded)).toBe(true);
			expect(recorded).toEqual([0, 41]);
			expect(blockNames(source)).toEqual(["early", "late"]);
		});

		it("keeps a short list's declarations in the slot itself", () => {
			const { BLOCK_DECLARATIONS: SLOT } = require(
				"../../lib/javascript/syntax-parser"
			);
			const { ast } = JavascriptParser._parse("void 0;\nconst only = 1;", {
				sourceType: "module",
				ranges: true,
				comments: true
			});
			// one declaration at index 1 and nothing allocated to say so
			expect(/** @type {EXPECTED_ANY} */ (ast)[SLOT]).toBe(0b10);
		});

		it("rejects a statement written before the first case", () => {
			const { WebpackParser } = require("../../lib/javascript/syntax-parser");
			expect(() =>
				WebpackParser.parse(
					"switch (1) { notACase(); }",
					/** @type {EXPECTED_ANY} */ (
						/** @type {unknown} */ ({
							ecmaVersion: "latest",
							sourceType: "module",
							lazyNodes: true
						})
					)
				)
			).toThrow(/Unexpected token/);
		});

		it("walks every statement again for a tap that expects them", () => {
			const source = "debugger;\nconst kept = 1;";
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
			const { ast, comments } = JavascriptParser._parse(source, {
				sourceType: "module",
				ranges: true,
				comments: true
			});
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
			const { ast, comments } = JavascriptParser._parse(source, {
				sourceType: "module",
				ranges: true,
				comments: true
			});
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
		const { WebpackParser } = require("../../lib/javascript/syntax-parser");

		/**
		 * @param {string} source source code
		 * @returns {EXPECTED_ANY} program AST
		 */
		// `lazyNodes` is webpack's private extension of the parser's Options
		const parseOptions =
			/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
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
				WebpackParser.parse(
					src,
					/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
						/** @type {unknown} */ ({ ecmaVersion: 5, lazyNodes: true })
					)
				)
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

		it("keeps arrow behavior when a plugin overrides parseArrowExpression", () => {
			// overriding disables `_arrowFastPath`; the type-based fallback probes
			// must reproduce the same accepts and rejects
			const plugin = /** @type {EXPECTED_ANY} */ (
				(/** @type {EXPECTED_ANY} */ P) =>
					class extends P {
						/**
						 * @param {...EXPECTED_ANY} args acorn args
						 * @returns {EXPECTED_ANY} arrow node
						 */
						parseArrowExpression(...args) {
							return super.parseArrowExpression(...args);
						}
					}
			);
			const Extended = WebpackParser.extend(plugin);
			expect(() => Extended.parse("() => {} ? a : b", parseOptions)).toThrow(
				/Unexpected token/
			);
			const ast = /** @type {EXPECTED_ANY} */ (
				Extended.parse("f = (x) => x + 1;", parseOptions)
			);
			expect(ast.body[0].expression.right.type).toBe("ArrowFunctionExpression");
		});

		it("rejects `**` with a bare arrow left operand like acorn 8.18", () => {
			expect(() => parse("x = () => {} ** 2")).toThrow(/Unexpected token/);
			const ok = parse("x = (() => {}) ** 2").body[0].expression.right;
			expect(ok.type).toBe("BinaryExpression");
			expect(ok.operator).toBe("**");
			expect(() => parse("x = -2 ** 2")).toThrow(/Unexpected token/);
			// the type-based fallback probe (plugin overriding parseArrowExpression)
			const Extended = WebpackParser.extend(
				/** @type {EXPECTED_ANY} */ (
					(/** @type {EXPECTED_ANY} */ P) =>
						class extends P {
							/**
							 * @param {...EXPECTED_ANY} args acorn args
							 * @returns {EXPECTED_ANY} arrow node
							 */
							parseArrowExpression(...args) {
								return super.parseArrowExpression(...args);
							}
						}
				)
			);
			expect(() => Extended.parse("x = () => {} ** 2", parseOptions)).toThrow(
				/Unexpected token/
			);
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

		it("delegates var declarations when a plugin overrides parseVarId", () => {
			let calls = 0;
			const Extended = WebpackParser.extend(
				/** @type {EXPECTED_ANY} */ (
					(/** @type {EXPECTED_ANY} */ P) =>
						class extends P {
							/**
							 * @param {...EXPECTED_ANY} args acorn args
							 * @returns {EXPECTED_ANY} declarator id
							 */
							parseVarId(...args) {
								calls++;
								return super.parseVarId(...args);
							}
						}
				)
			);
			const ast = /** @type {EXPECTED_ANY} */ (
				Extended.parse("var a = 1; for (let b = 0; b < 1; b++);", parseOptions)
			);
			expect(calls).toBe(2);
			expect(ast.body[0].declarations[0].id.name).toBe("a");
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

		it("appends to a `program` continuation node like acorn", () => {
			const first = parse("a;");
			const second = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					"b;",
					/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
						/** @type {unknown} */ ({
							ecmaVersion: 2022,
							lazyNodes: true,
							program: first
						})
					)
				)
			);
			expect(second).toBe(first);
			expect(second.body).toHaveLength(2);
		});

		it("reports acorn's error for string names bound without `from`", () => {
			/**
			 * @param {string} source module source code
			 * @returns {() => void} thunk parsing the source as a module
			 */
			const parseModule = (source) => () =>
				WebpackParser.parse(
					source,
					/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
						/** @type {unknown} */ ({
							ecmaVersion: "latest",
							sourceType: "module",
							lazyNodes: true
						})
					)
				);
			expect(parseModule('export { "x" };')).toThrow(
				/A string literal cannot be used as an exported binding without `from`/
			);
			expect(parseModule('import { "x" } from "y";')).toThrow(/Binding rvalue/);
		});

		it("serves comment ranges lazily with a stable memo and writable slot", () => {
			/** @type {EXPECTED_ANY[]} */
			const comments = [];
			WebpackParser.parse(
				"// hi\nvar x = 1; /* block */",
				/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
					/** @type {unknown} */ ({
						ecmaVersion: 2022,
						lazyNodes: true,
						lazyComments: comments
					})
				)
			);
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

		it("serves a direct caller's `ranges` lazily, leaving its options alone", () => {
			const options = { ecmaVersion: 2022, lazyNodes: true, ranges: true };
			const program = /** @type {EXPECTED_ANY} */ (
				WebpackParser.parse(
					"var x = 1;",
					/** @type {import("../../lib/javascript/syntax-parser").Options} */ (
						/** @type {unknown} */ (options)
					)
				)
			);
			expect(options).toEqual({
				ecmaVersion: 2022,
				lazyNodes: true,
				ranges: true
			});
			const declaration = program.body[0];
			// lazy: `range` comes from the prototype getter, not from the node
			expect(
				Object.getOwnPropertyDescriptor(declaration, "range")
			).toBeUndefined();
			expect(declaration.range).toEqual([0, 10]);
			expect(declaration.range).toBe(declaration.range);
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
			expect(readsWith("x++;", "write", false)).toEqual(["x"]);
			expect(readsWith("x.y++;", "writeMemberChain", false)).toEqual(["x"]);
		});

		it("lets a tap that rendered the whole update stop the walk", () => {
			expect(readsWith("x++;", "write", true)).toEqual([]);
			expect(readsWith("x.y++;", "writeMemberChain", true)).toEqual([]);
		});
	});
});
