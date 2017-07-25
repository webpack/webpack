"use strict";

const should = require("should");

const Parser = require("../lib/Parser");
const BasicEvaluatedExpression = require("../lib/BasicEvaluatedExpression");

describe("Parser", () => {
	const testCases = {
		"call ident": [
			function() {
				abc("test");
			}, {
				abc: ["test"]
			}
		],
		"call member": [
			function() {
				cde.abc("membertest");
			}, {
				cdeabc: ["membertest"]
			}
		],
		"call member using bracket notation": [
			function() {
				cde["abc"]("membertest");
			}, {
				cdeabc: ["membertest"]
			}
		],
		"call inner member": [
			function() {
				cde.ddd.abc("inner");
			}, {
				cdedddabc: ["inner"]
			}
		],
		"call inner member using bracket notation": [
			function() {
				cde.ddd["abc"]("inner");
			}, {
				cdedddabc: ["inner"]
			}
		],
		"expression": [
			function() {
				fgh;
			}, {
				fgh: [""]
			}
		],
		"expression sub": [
			function() {
				fgh.sub;
			}, {
				fghsub: ["notry"]
			}
		],
		"member expression": [
			function() {
				test[memberExpr]
				test[+memberExpr]
			}, {
				expressions: ["memberExpr", "memberExpr"]
			}
		],
		"in function definition": [
			function() {
				(function(abc, cde, fgh) {
					abc("test");
					cde.abc("test");
					cde.ddd.abc("test");
					fgh;
					fgh.sub;
				})();
			}, {}
		],
		"const definition": [
			function() {
				let abc, cde, fgh;
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
				fgh.sub;
			}, {}
		],
		"var definition": [
			function() {
				var abc, cde, fgh;
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
				fgh.sub;
			}, {}
		],
		"function definition": [
			function() {
				function abc() {}

				function cde() {}

				function fgh() {}
				abc("test");
				cde.abc("test");
				cde.ddd.abc("test");
				fgh;
				fgh.sub;
			}, {}
		],
		"in try": [
			function() {
				try {
					fgh.sub;
					fgh;

					function test(ttt) {
						fgh.sub;
						fgh;
					}
				} catch(e) {
					fgh.sub;
					fgh;
				}
			}, {
				fghsub: ["try", "notry", "notry"],
				fgh: ["test", "test ttt", "test e"]
			}
		],
		"renaming with const": [
			function() {
				const xyz = abc;
				xyz("test");
			}, {
				abc: ["test"]
			}
		],
		"renaming with var": [
			function() {
				var xyz = abc;
				xyz("test");
			}, {
				abc: ["test"]
			}
		],
		"renaming with assignment": [
			function() {
				const xyz = abc;
				xyz("test");
			}, {
				abc: ["test"]
			}
		],
		"renaming with IIFE": [
			function() {
				! function(xyz) {
					xyz("test");
				}(abc);
			}, {
				abc: ["test"]
			}
		],
		"renaming arguments with IIFE (called)": [
			function() {
				! function(xyz) {
					xyz("test");
				}.call(fgh, abc);
			}, {
				abc: ["test"],
				fgh: [""]
			}
		],
		"renaming this's properties with IIFE (called)": [
			function() {
				! function() {
					this.sub;
				}.call(ijk);
			}, {
				ijksub: ["test"]
			}
		],
		"renaming this's properties with nested IIFE (called)": [
			function() {
				! function() {
					! function() {
						this.sub;
					}.call(this);
				}.call(ijk);
			}, {
				ijksub: ["test"]
			}
		],
	};

	Object.keys(testCases).forEach((name) => {
		it("should parse " + name, () => {
			let source = testCases[name][0].toString();
			source = source.substr(13, source.length - 14).trim();
			const state = testCases[name][1];

			const testParser = new Parser({});
			testParser.plugin("can-rename abc", (expr) => true);
			testParser.plugin("can-rename ijk", (expr) => true);
			testParser.plugin("call abc", (expr) => {
				if(!testParser.state.abc) testParser.state.abc = [];
				testParser.state.abc.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("call cde.abc", (expr) => {
				if(!testParser.state.cdeabc) testParser.state.cdeabc = [];
				testParser.state.cdeabc.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("call cde.ddd.abc", (expr) => {
				if(!testParser.state.cdedddabc) testParser.state.cdedddabc = [];
				testParser.state.cdedddabc.push(testParser.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("expression fgh", (expr) => {
				if(!testParser.state.fgh) testParser.state.fgh = [];
				testParser.state.fgh.push(testParser.scope.definitions.join(" "));
				return true;
			});
			testParser.plugin("expression fgh.sub", (expr) => {
				if(!testParser.state.fghsub) testParser.state.fghsub = [];
				testParser.state.fghsub.push(testParser.scope.inTry ? "try" : "notry");
				return true;
			});
			testParser.plugin("expression ijk.sub", (expr) => {
				if(!testParser.state.ijksub) testParser.state.ijksub = [];
				testParser.state.ijksub.push("test");
				return true;
			});
			testParser.plugin("expression memberExpr", (expr) => {
				if(!testParser.state.expressions) testParser.state.expressions = [];
				testParser.state.expressions.push(expr.name);
				return true;
			});
			const actual = testParser.parse(source);
			should.strictEqual(typeof actual, "object");
			actual.should.be.eql(state);
		});
	});

	it("should parse comments", () => {
		const source = "//comment1\n/*comment2*/";
		const state = [{
			type: "Line",
			value: "comment1"
		}, {
			type: "Block",
			value: "comment2"
		}];

		const testParser = new Parser({});

		testParser.plugin("program", (ast, comments) => {
			if(!testParser.state.comments) testParser.state.comments = comments;
			return true;
		});

		const actual = testParser.parse(source);
		should.strictEqual(typeof actual, "object");
		should.strictEqual(typeof actual.comments, "object");
		actual.comments.forEach((element, index) => {
			should.strictEqual(typeof element.type, "string");
			should.strictEqual(typeof element.value, "string");
			element.type.should.be.eql(state[index].type);
			element.value.should.be.eql(state[index].value);
		});
	});

	describe("expression evaluation", () => {
		function evaluateInParser(source) {
			const parser = new Parser();
			parser.plugin("call test", (expr) => {
				parser.state.result = parser.evaluateExpression(expr.arguments[0]);
			});
			parser.plugin("evaluate Identifier aString", (expr) =>
				new BasicEvaluatedExpression().setString("aString").setRange(expr.range));
			parser.plugin("evaluate Identifier b.Number", (expr) =>
				new BasicEvaluatedExpression().setNumber(123).setRange(expr.range));
			return parser.parse("test(" + source + ");").result;
		}

		const testCases = {
			"\"strrring\"": "string=strrring",
			"\"strr\" + \"ring\"": "string=strrring",
			"\"s\" + (\"trr\" + \"rin\") + \"g\"": "string=strrring",
			"'S' + (\"strr\" + \"ring\") + 'y'": "string=Sstrrringy",
			"/abc/": "regExp=/abc/",
			"1": "number=1",
			"1 + 3": "number=4",
			"3 - 1": "number=2",
			"1 == 1": "bool=true",
			"1 === 1": "bool=true",
			"3 != 1": "bool=true",
			"3 !== 1": "bool=true",
			"3 == 1": "bool=false",
			"3 === 1": "bool=false",
			"1 != 1": "bool=false",
			"1 !== 1": "bool=false",
			"true === false": "bool=false",
			"false !== false": "bool=false",
			"true == true": "bool=true",
			"false != true": "bool=true",
			"!'a'": "bool=false",
			"!''": "bool=true",
			"'pre' + a": "wrapped=['pre' string=pre]+[null]",
			"a + 'post'": "wrapped=[null]+['post' string=post]",
			"'pre' + a + 'post'": "wrapped=['pre' string=pre]+['post' string=post]",
			"1 + a + 2": "",
			"1 + a + 'post'": "wrapped=[null]+['post' string=post]",
			"'' + 1 + a + 2": "wrapped=['' + 1 string=1]+[2 string=2]",
			"'' + 1 + a + 2 + 3": "wrapped=['' + 1 string=1]+[2 + 3 string=23]",
			"'' + 1 + a + (2 + 3)": "wrapped=['' + 1 string=1]+[2 + 3 string=5]",
			"'pre' + (1 + a) + (2 + 3)": "wrapped=['pre' string=pre]+[2 + 3 string=5]",
			"a ? 'o1' : 'o2'": "options=['o1' string=o1],['o2' string=o2]",
			"a ? 'o1' : b ? 'o2' : 'o3'": "options=['o1' string=o1],['o2' string=o2],['o3' string=o3]",
			"a ? (b ? 'o1' : 'o2') : 'o3'": "options=['o1' string=o1],['o2' string=o2],['o3' string=o3]",
			"a ? (b ? 'o1' : 'o2') : c ? 'o3' : 'o4'": "options=['o1' string=o1],['o2' string=o2],['o3' string=o3],['o4' string=o4]",
			"a ? 'o1' : b ? 'o2' : c ? 'o3' : 'o4'": "options=['o1' string=o1],['o2' string=o2],['o3' string=o3],['o4' string=o4]",
			"a ? 'o1' : b ? b : c ? 'o3' : c": "options=['o1' string=o1],[b],['o3' string=o3],[c]",
			"['i1', 'i2', 3, a, b ? 4 : 5]": "items=['i1' string=i1],['i2' string=i2],[3 number=3],[a],[b ? 4 : 5 options=[4 number=4],[5 number=5]]",
			"typeof 'str'": "string=string",
			"typeof aString": "string=string",
			"typeof b.Number": "string=number",
			"typeof b['Number']": "string=number",
			"typeof b[Number]": "",
			"b.Number": "number=123",
			"b['Number']": "number=123",
			"b[Number]": "",
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
			"'a' + expr + 1": "wrapped=['a' string=a]+[1 string=1]",
		};

		Object.keys(testCases).forEach((key) => {

			function evalExprToString(evalExpr) {
				if(!evalExpr) {
					return "null";
				} else {
					const result = [];
					if(evalExpr.isString()) result.push("string=" + evalExpr.string);
					if(evalExpr.isNumber()) result.push("number=" + evalExpr.number);
					if(evalExpr.isBoolean()) result.push("bool=" + evalExpr.bool);
					if(evalExpr.isRegExp()) result.push("regExp=" + evalExpr.regExp);
					if(evalExpr.isConditional()) result.push("options=[" + evalExpr.options.map(evalExprToString).join("],[") + "]");
					if(evalExpr.isArray()) result.push("items=[" + evalExpr.items.map(evalExprToString).join("],[") + "]");
					if(evalExpr.isConstArray()) result.push("array=[" + evalExpr.array.join("],[") + "]");
					if(evalExpr.isWrapped()) result.push("wrapped=[" + evalExprToString(evalExpr.prefix) + "]+[" + evalExprToString(evalExpr.postfix) + "]");
					if(evalExpr.range) {
						const start = evalExpr.range[0] - 5;
						const end = evalExpr.range[1] - 5;
						return key.substr(start, end - start) + (result.length > 0 ? " " + result.join(" ") : "");
					}
					return result.join(" ");
				}
			}

			it("should eval " + key, () => {
				const evalExpr = evaluateInParser(key);
				evalExprToString(evalExpr).should.be.eql(testCases[key] ? key + " " + testCases[key] : key);
			});
		});
	});

	describe("async/await support", () => {
		describe("should accept", () => {
			const cases = {
				"async function": "async function x() {}",
				"async arrow function": "async () => {}",
				"await expression": "async function x(y) { await y }"
			};
			const parser = new Parser();
			Object.keys(cases).forEach((name) => {
				const expr = cases[name];
				it(name, () => {
					const actual = parser.parse(expr);
					should.strictEqual(typeof actual, "object");
				});
			});
		});
		describe("should parse await", () => {
			const cases = {
				"require": [
					"async function x() { await require('y'); }", {
						param: "y"
					}
				],
				"System.import": [
					"async function x() { const y = await System.import('z'); }", {
						param: "z"
					}
				]
			};

			const parser = new Parser();
			parser.plugin("call require", (expr) => {
				const param = parser.evaluateExpression(expr.arguments[0]);
				parser.state.param = param.string;
			});
			parser.plugin("call System.import", (expr) => {
				const param = parser.evaluateExpression(expr.arguments[0]);
				parser.state.param = param.string;
			});

			Object.keys(cases).forEach((name) => {
				it(name, () => {
					const actual = parser.parse(cases[name][0]);
					actual.should.be.eql(cases[name][1]);
				});
			});
		});
	});
});
