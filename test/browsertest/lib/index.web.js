// Should not break it... should not include complete directory...
require = require("enhanced-require")(module);
if(typeof define != "function") var define = require.define;

function test(cond, message) {
	if(!cond) throw new Error(message);
}

// load tests from libary1, with script loader
require("script!../js/libary1.js");

// Buildin 'style' loader adds css to document
require("../css/stylesheet.css");
require("../less/stylesheet.less");

function testCase(number) {
	//window.test(require("./folder/file" + (number === 1 ? 1 : "2")) === "file" + number);
	require(number === 1 ? "../folder/file1" : number === 2 ? "../folder/file2" : number === 3 ? "../folder/file3" : "./missingModule").should.be.eql("file" + number);
	require(
		number === 1 ? "../folder/file1" :
		number === 2 ? "../folder/file2" :
		number === 3 ? "../folder/file3" :
		"./missingModule"
	).should.be.eql("file" + number);
}

describe("main", function() {
	it("should load libary1 with script-loader", function() {
		should.exist(window.libary1);
		window.libary1.should.be.eql(true);
	});

	it("should load libary1 with script-loader", function() {
		should.exist(window.libary2);
		should.exist(window.libary2.ok);
		window.libary2.ok.should.be.eql(true);
	});

	describe("resolving", function() {
		it("should load index.web.js instead of index.js", function() {
			true.should.be.eql(true);
		});

		it("should load single file modules", function() {
			require("subfilemodule").should.be.eql("subfilemodule");
		});

		it("should load correct replacements for files", function(done) {
			require.ensure(["subcontent"], function(require) {
				// Comments work!
				exports.ok = true;
				test(require("subcontent") === "replaced", "node_modules should be replaced with web_modules");
				test(require("subcontent-jam") === "replaced", "node_modules should be replaced with jam");
				test(require("subcontent2/file.js") === "orginal", "node_modules should still work when web_modules exists");
				done();
			});
		});

		after(function() {
			should.exist(exports.ok);
			exports.ok.should.be.eql(true);
		});
	});

	describe("runtime", function() {
		it("should load circular dependencies correctly", function() {
			require("./circular").should.be.eql(1);
		});

		it("should cache modules correctly", function(done) {
			require("./singluar.js").value.should.be.eql(1);
			(require("./singluar.js")).value.should.be.eql(1);
			require("./sing" + "luar.js").value = 2;
			require("./singluar.js").value.should.be.eql(2);
			require.ensure(["./two.js"], function(require) {
				require("./singluar.js").value.should.be.eql(2);
				done();
			});
		});

		it("should throw an error on missing module at runtime, but not at compile time if in try block", function() {
			var error = null;
			try {
				testCase(4); // indirect
			} catch(e) {
				error = e;
			}
			error.should.be.instanceOf(Error);

			error = null;
			try {
				require("./missingModule2"); // direct
			} catch(e) {
				error = e;
			}
			error.should.be.instanceOf(Error);
		});

		it("should fire multiple code load callbacks in the correct order", function(done) {
			var calls = [];
			require.ensure([], function(require) {
				require("./duplicate");
				require("./duplicate2");
				calls.push(1);
			});
			require.ensure([], function(require) {
				require("./duplicate");
				require("./duplicate2");
				calls.push(2);
				calls.should.be.eql([1,2]);
				done();
			});
		});

		it("should be able the remove modules from cache with require.cache and require.resolve", function() {
			var singlarObj = require("./singluar2");
			var singlarId = require.resolve("./singluar2");
			var singlarIdInConditional = require.resolve(true ? "./singluar2" : "./singluar");
			singlarId.should.be.a("number");
			singlarIdInConditional.should.be.eql(singlarId);
			should.exist(require.cache);
			should.exist(require.cache[singlarId]);
			require.cache[singlarId].should.be.a("object");
			delete require.cache[singlarId];
			require("./singluar2").should.be.not.equal(singlarObj);
		});
	});

	describe("context", function() {
		it("should be able to load a file with the require.context method", function() {
			require.context("../templates")("./tmpl").should.be.eql("test template");
			(require.context("../././templates"))("./tmpl").should.be.eql("test template");
			(require.context(".././templates/.")("./tmpl")).should.be.eql("test template");
			require . context ( "." + "." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" ).should.be.eql("subdir test template");
		});

		it("should automatically create contexts", function() {
			var template = "tmpl", templateFull = "./tmpl.js";
			require("../templates/" + template).should.be.eql("test template");
			require("../templates/templateLoader")(templateFull).should.be.eql("test template");
			require("../templates/templateLoaderIndirect")(templateFull).should.be.eql("test template");
		});

		it("should also work in a chunk", function(done) {
			require.ensure([], function(require) {
				var contextRequire = require.context(".");
				contextRequire("./two").should.be.eql(2);
				var tw = "tw";
				require("." + "/" + tw + "o").should.be.eql(2);
				done();
			});
		});

		it("should be able to use a context with a loader", function() {
			var abc = "abc", scr = "script.coffee";
			require("../resources/" + scr).should.be.eql("coffee test");
			require("raw!../resources/" + abc + ".txt").should.be.eql("abc");
		});
	});

	describe("parsing", function() {

		it("should parse complex require calls", function() {
			test(new(require("./constructor"))(1234).value == 1234, "Parse require in new(...) should work");
			test(new ( require ( "./constructor" ) ) ( 1234 ) .value == 1234, "Parse require in new(...) should work, with spaces");
		});

		it("should let the user hide the require function", function() {
			(function(require) { return require; }(1234)).should.be.eql(1234);
			function testFunc(abc, require) {
				return require;
			}
			testFunc(333, 678).should.be.eql(678);
			(function() {
				var require = 123;
				require.should.be.eql(123);
			}());
			(function() {
				var module = 1233;
				module.should.be.eql(1233);
			}());
		});

		it("should not create a context for the ?: operator", function() {
			testCase(1);
			testCase(2);
			testCase(3);
		});

		it("should not create a context for typeof require", function() {
			require("../folder/typeof").should.be.eql("function");
		});
	});

	describe("polyfilling", function() {
		var sum2;

		before(function() {
			sum2 = 0;
		});

		it("should polyfill process and module", function(done) {
			module.id.should.be.a("number");
			module.id.should.be.eql(require.resolve("./index.web.js"));
			require.ensure([], function(require) {
				test(process.argv && process.argv.length > 1, "process.argv should be an array");
				process.nextTick(function() {
					sum2++;
					sum2.should.be.eql(2);
					done();
				});
				process.on("xyz", function() {
					sum2++;
				});
				process.emit("xyz");
				test(global === window, "global === window");
			});
		});
	});


	describe("chunks", function() {
		it("should handle duplicate chunks", function(done) {
			var firstOne = false, secondOne = false;
			require.ensure([], function(require) {
				require("./acircular");
				require("./duplicate");
				require("./duplicate2");
				firstOne = true;
				if(secondOne) done();
			});
			require.ensure([], function(require) {
				require("./acircular2");
				require("./duplicate");
				require("./duplicate2");
				secondOne = true;
				if(firstOne) done();
			});
		});
	});

	describe("loaders", function() {
		it("should run a loader from package.json", function() {
			require("testloader!../resources/abc.txt").should.be.eql("abcwebpack");
			require("testloader/lib/loader2!../resources/abc.txt").should.be.eql("abcweb");
			require("testloader/lib/loader3!../resources/abc.txt").should.be.eql("abcloader");
			require("testloader/lib/loader-indirect!../resources/abc.txt").should.be.eql("abcwebpack");
		});
		it("should run a loader from .webpack-loader.js extension", function() {
			require("testloader/lib/loader!../resources/abc.txt").should.be.eql("abcwebpack");
		});
		it("should be able to pipe loaders", function() {
			require("testloader!../loaders/reverseloader!../resources/abc.txt").should.be.eql("cbawebpack");
		});
		describe("buildin", function() {
			it("should handle the raw loader correctly", function() {
				require("raw!../resources/abc.txt").should.be.eql("abc");
			});
			it("should handle the json loader correctly", function() {
				require("json!../../../package.json").name.should.be.eql("webpack");
				require("../../../package.json").name.should.be.eql("webpack");
			});
			it("should handle the jade loader correctly", function() {
				require("jade!../resources/template.jade")({abc: "abc"}).should.be.eql("<p>abc</p>");
				require("../resources/template.jade")({abc: "abc"}).should.be.eql("<p>abc</p>");
			});
			it("should handle the coffee loader correctly", function() {
				require("coffee!../resources/script.coffee").should.be.eql("coffee test");
				require("../resources/script.coffee").should.be.eql("coffee test");
			});
			it("should handle the css loader correctly", function() {
				require("css!../css/stylesheet.css").indexOf(".rule-direct").should.not.be.eql(-1);
				require("css!../css/stylesheet.css").indexOf(".rule-import1").should.not.be.eql(-1);
				require("css!../css/stylesheet.css").indexOf(".rule-import2").should.not.be.eql(-1);
			});
			it("should handle the val loader (piped with css loader) correctly", function() {
				require("css!val!../css/generateCss").indexOf("generated").should.not.be.eql(-1);
				require("css!val!../css/generateCss").indexOf(".rule-import2").should.not.be.eql(-1);
				require("raw!val!../css/generateCss").indexOf("generated").should.not.be.eql(-1);
			});
			it("should handle the val loader (piped with css loader) correctly", function() {
				require("less!../less/stylesheet.less").indexOf(".less-rule-direct").should.not.be.eql(-1);
				require("less!../less/stylesheet.less").indexOf(".less-rule-import1").should.not.be.eql(-1);
				require("less!../less/stylesheet.less").indexOf(".less-rule-import2").should.not.be.eql(-1);
			});
			it("should handle the file loader correctly", function() {
				require("file/png!../img/image.png").should.match(/^js\/.+\.png$/);
				document.getElementById("image").src = require("file/png!../img/image.png");
			});
		});
	});

	describe("AMD", function() {
		it("should be able to use AMD-style require", function(done) {
			var template = "tmpl";
			require(["./circular", "../templates/" + template, true ? "./circular" : "./circular"], function(circular, testTemplate, circular2) {
				circular.should.be.eql(1);
				circular2.should.be.eql(1);
				testTemplate.should.be.eql("test template");
				done();
			});
		});
		it("should be able to use require.js-style define", function(done) {
			define("name", ["./circular"], function(circular) {
				circular.should.be.eql(1);
				done();
			});
		});
		it("should be able to use require.js-style define, without name", function(done) {
			define(["./circular"], function(circular) {
				circular.should.be.eql(1);
				done();
			});
		});
		it("should be able to use require.js-style define, with empty dependencies", function(done) {
			define("name", [], function() {
				done();
			});
		});
		it("should be able to use require.js-style define, without dependencies", function(done) {
			define("name", function() {
				done();
			});
		});
		var obj = {};
		it("should be able to use require.js-style define, with an object", function() {
			define("blaaa", obj);
		});
		after(function() {
			module.exports.should.be.equal(obj);
		});
		it("should offer AMD-style define for CommonJs", function(done) {
			var _test_require = require.valueOf();
			var _test_exports = module.exports;
			var _test_module = module;
			define(function(require, exports, module) {
				(typeof require).should.be.eql("function");
				require.valueOf().should.be.equal(_test_require);
				exports.should.be.equal(_test_exports);
				module.should.be.equal(_test_module);
				require("./circular").should.be.eql(1);
				done();
			});
		});
		it("should not crash on require.js require only with array", function() {
			require(["./circular"]);
		});
		it("should create a chunk for require.js require", function(done) {
			var sameTick = true;
			require(["./c"], function(c) {
				sameTick.should.be.eql(false);
				c.should.be.eql("c");
				require("./d").should.be.eql("d");
				done();
			});
			sameTick = false;
		});
	});

	describe("cross module system", function() {
		it("should answer typeof require correctly", function() {
			(typeof require).should.be.eql("function");
		});
		it("should answer typeof define correctly", function() {
			(typeof define).should.be.eql("function");
		});
		it("should answer typeof require.amd correctly", function() {
			(typeof require.amd).should.be.eql("object");
		});
		it("should answer typeof define.amd correctly", function() {
			(typeof define.amd).should.be.eql("object");
		});
		it("should answer typeof module correctly", function() {
			(typeof module).should.be.eql("object");
		});
		it("should answer typeof exports correctly", function() {
			(typeof exports).should.be.eql("object");
		});
	});

	describe("node.js tests", function() {
		require("../nodetests");
	});

});
