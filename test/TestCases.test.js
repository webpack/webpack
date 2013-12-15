var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/Test");

var webpack = require("../lib/webpack");

describe("TestCases", function() {
	var casesPath = path.join(__dirname, "cases");
	var categories = fs.readdirSync(casesPath);
	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			})
		};
	});
	categories.forEach(function(category) {
		describe(category.name, function() {
			category.tests.forEach(function(testName) {
				var suite = describe(testName, function() {});
				it("should compile " + testName, function(done) {
					var testDirectory = path.join(casesPath, category.name, testName);
					var outputDirectory = path.join(__dirname, "js", category.name, testName);
					webpack({
						context: casesPath,
						entry: "./" + category.name + "/" + testName +"/index",
						target: "async-node",
						devtool: "eval",
						output: {
							pathinfo: true,
							path: outputDirectory,
							filename: "bundle.js"
						},
						module: {
							loaders: [
								{ test: /\.json$/, loader: "json" },
								{ test: /\.coffee$/, loader: "coffee" },
								{ test: /\.jade$/, loader: "jade" }
							]
						}
					}, function(err, stats) {
						if(err) return done(err);
						var jsonStats = stats.toJson();
						if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
						if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
						var exportedTest = 0;
						function _it(title, fn) {
							var test = new Test(title, fn);
							suite.addTest(test);
							exportedTest++;
							return test;
						}
						function _require(module) {
							if(module.substr(0, 2) === "./") {
								var p = path.join(outputDirectory, module);
								var fn = vm.runInThisContext("(function(require, module, exports, __dirname, it) {" + fs.readFileSync(p, "utf-8") + "\n})", p);
								var module = { exports: {} };
								fn.call(module.exports, _require, module, module.exports, outputDirectory, _it);
								return module.exports;
							} else return require(module);
						}
						_require("./bundle.js");
						if(exportedTest === 0) return done(new Error("No tests exported by test case"));
						done();
					});
				});
			});
		});
	});
	function checkArrayExpectation(testDirectory, object, kind, upperCaseKind, done) {
		var array = object[kind+"s"].slice().sort();
		if(fs.existsSync(path.join(testDirectory, kind+ "s.js"))) {
			var expected = require(path.join(testDirectory, kind + "s.js"));
			if(expected.length < array.length)
				return done(new Error("More " + kind + "s while compiling than expected:\n\n" + array.join("\n\n"))), true;
			else if(expected.length > array.length)
				return done(new Error("Less " + kind + "s while compiling than expected:\n\n" + array.join("\n\n"))), true;
			for(var i = 0; i < array.length; i++) {
				if(Array.isArray(expected[i])) {
					for(var j = 0; j < expected[i].length; j++) {
						if(!expected[i][j].test(array[i]))
							return done(new Error(upperCaseKind + " " + i + ": " + array[i] + " doesn't match " + expected[i][j].toString())), true;
					}
				} else if(!expected[i].test(array[i]))
					return done(new Error(upperCaseKind + " " + i + ": " + array[i] + " doesn't match " + expected[i].toString())), true;
			}
		} else if(array.length > 0) {
			return done(new Error(upperCaseKind + "s while compiling:\n\n" + array.join("\n\n"))), true;
		}
	}
});