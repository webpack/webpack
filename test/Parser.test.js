var should = require("should");

var Parser = require("../lib/Parser");
var BasicEvaluatedExpression = require("../lib/BasicEvaluatedExpression");

describe("Parser", function() {
	var testCases = {
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
		"call inner member": [
			function() {
				cde.ddd.abc("inner");
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
				fgh: ["", "test ttt", "test e"]
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
				var xyz;
				xyz = abc;
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
		"renaming with IIFE (called)": [
			function() {
				! function(xyz) {
					xyz("test");
				}.call(fgh, abc);
			}, {
				abc: ["test"],
				fgh: [""]
			}
		],
	};

	Object.keys(testCases).forEach(function(name) {
		it("should parse " + name, function() {
			var source = testCases[name][0].toString();
			source = source.substr(13, source.length - 14).trim();
			var state = testCases[name][1];

			var testParser = new Parser({});
			testParser.plugin("can-rename abc", function(expr) {
				return true;
			});
			testParser.plugin("call abc", function(expr) {
				if(!this.state.abc) this.state.abc = []
				this.state.abc.push(this.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("call cde.abc", function(expr) {
				if(!this.state.cdeabc) this.state.cdeabc = []
				this.state.cdeabc.push(this.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("call cde.ddd.abc", function(expr) {
				if(!this.state.cdedddabc) this.state.cdedddabc = []
				this.state.cdedddabc.push(this.parseString(expr.arguments[0]));
				return true;
			});
			testParser.plugin("expression fgh", function(expr) {
				if(!this.state.fgh) this.state.fgh = []
				this.state.fgh.push(this.scope.definitions.join(" "));
				return true;
			});
			testParser.plugin("expression fgh.sub", function(expr) {
				if(!this.state.fghsub) this.state.fghsub = []
				this.state.fghsub.push(this.scope.inTry ? "try" : "notry");
				return true;
			});
			testParser.plugin("expression memberExpr", function(expr) {
				if(!this.state.expressions) this.state.expressions = []
				this.state.expressions.push(expr.name);
				return true;
			});
			var actual = testParser.parse(source);
			should.strictEqual(typeof actual, "object");
			actual.should.be.eql(state);
		});
	});

	describe("expression evaluation", function() {
		function evaluateInParser(source) {
			var parser = new Parser();
			parser.plugin("call test", function(expr) {
				this.state.result = this.evaluateExpression(expr.arguments[0]);
			});
			parser.plugin("evaluate Identifier aString", function(expr) {
				return new BasicEvaluatedExpression().setString("aString").setRange(expr.range);
			});
			parser.plugin("evaluate Identifier b.Number", function(expr) {
				return new BasicEvaluatedExpression().setNumber(123).setRange(expr.range);
			});
			return parser.parse("test(" + source + ");").result;
		}

		var testCases = {
			"\"strrring\"": "string=strrring",
			"\"strr\" + \"ring\"": "string=strrring",
			"\"s\" + (\"trr\" + \"rin\") + \"g\"": "string=strrring",
			"'S' + (\"strr\" + \"ring\") + 'y'": "string=Sstrrringy",
			"1": "number=1",
			"1 + 3": "number=4",
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
			"typeof b[Number]": "",
			"b.Number": "number=123",
			"b[Number]": "",
			"'abc'.substr(1)": "string=bc",
			"'abc'[substr](1)": "",
		};

		Object.keys(testCases).forEach(function(key) {

			function evalExprToString(evalExpr) {
				if(!evalExpr) {
					return "null";
				} else {
					var result = [];
					if(evalExpr.isString()) result.push("string=" + evalExpr.string);
					if(evalExpr.isNumber()) result.push("number=" + evalExpr.number);
					if(evalExpr.isRegExp()) result.push("regExp=" + evalExpr.regExp);
					if(evalExpr.isConditional()) result.push("options=[" + evalExpr.options.map(evalExprToString).join("],[") + "]");
					if(evalExpr.isArray()) result.push("items=[" + evalExpr.items.map(evalExprToString).join("],[") + "]");
					if(evalExpr.isWrapped()) result.push("wrapped=[" + evalExprToString(evalExpr.prefix) + "]+[" + evalExprToString(evalExpr.postfix) + "]");
					if(evalExpr.range) {
						var start = evalExpr.range[0] - 5;
						var end = evalExpr.range[1] - 5;
						return key.substr(start, end - start) + (result.length > 0 ? " " + result.join(" ") : "");
					}
					return result.join(" ");
				}
			}

			it("should eval " + key, function() {
				var evalExpr = evaluateInParser(key);
				evalExprToString(evalExpr).should.be.eql(testCases[key] ? key + " " + testCases[key] : key);
			});
		});
	});
});
