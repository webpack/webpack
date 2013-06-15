// Should not break it...
if(typeof require !== "function")
	var require = require("amdrequire");
if(typeof define != "function")
	var define = require("amdefine");

function test(cond, message) {
	if(!cond) throw new Error(message);
}

// load tests from library1, with script loader
require("script!../js/library1.js");

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
	it("should load library1 with script-loader", function() {
		should.exist(window.library1);
		window.library1.should.be.eql(true);
	});

	it("should load library2 exported as global", function() {
		should.exist(window.library2);
		should.exist(window.library2.ok);
		window.library2.ok.should.be.eql(true);
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

		it("should have support for require.main", function() {
			var value = require.main === module;
			var otherModuleValue = require("./testRequireMain");
			value.should.be.eql(true);
			otherModuleValue.should.be.eql(false);
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
				function require() {
					return 123;
				};
				require("error").should.be.eql(123);
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

		it("should parse and evaluate labeled modules", function() {
			var lbm = require("./labeledModuleA");
			lbm.should.have.property("x").be.eql("x");
			lbm.should.have.property("y").be.a("function");
			lbm.y().should.be.eql("y");
			lbm.should.have.property("z").be.eql("z");
			lbm.should.have.property("foo").be.a("function");
			lbm.foo().should.be.eql("foo");
		});

		it("should not parse filtered stuff", function() {
			if(typeof require != "function") require("fail");
			if(typeof require !== "function") require("fail");
			if(!(typeof require == "function")) require("fail");
			if(!(typeof require === "function")) require("fail");
			if(typeof require == "undefined") require = require("fail");
			if(typeof require === "undefined") require = require("fail");
			if(typeof module == "undefined") module = require("fail");
			if(typeof module === "undefined") module = require("fail");
			if(typeof module != "object") module = require("fail");
			if(typeof exports == "undefined") exports = require("fail");
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
				test(Array.isArray(process.argv), "process.argv should be an array");
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

		it("should handle named chunks", function(done) {
			var sync = false;
			require.ensure([], function(require) {
				require("./empty?a");
				require("./empty?b");
				sync = true;
				testLoad();
				sync = false;
				done();
			}, "named-chunk");
			function testLoad() {
				require.ensure([], function(require) {
					require("./empty?c");
					require("./empty?d");
					sync.should.be.ok;
				}, "named-chunk");
			}
		});

		it("should accept a require.include call", function() {
			require.include("./require.include");
			var value = null;
			require.ensure([], function(require) {
				value = require("./require.include");
			});
			should.exist(value);
			value.should.be.eql("require.include");
		});

		it("should not load a chunk which is included in a already loaded one", function(done) {
			var async = false;
			require.ensure(["./empty?x", "./empty?y", "./empty?z"], function(require) {
				async.should.be.eql(true);
				loadChunk();
			});
			async = true;
			function loadChunk() {
				var sync = true;
				require.ensure(["./empty?x", "./empty?y"], function(require) {
					sync.should.be.eql(true);
					done();
				});
				sync = false;
			}
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
			var _test_exports = exports;
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

	describe("context", function() {
		it("should be able to load a file with the require.context method", function() {
			require.context("../templates")("./tmpl").should.be.eql("test template");
			(require.context("../././templates"))("./tmpl").should.be.eql("test template");
			(require.context(".././templates/.")("./tmpl")).should.be.eql("test template");
			require . context ( "." + "." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" ).should.be.eql("subdir test template");
			require.context("../templates", true, /./)("xyz").should.be.eql("xyz");
		});

		it("should automatically create contexts", function() {
			var template = "tmpl", templateFull = "./tmpl.js";
			var mp = "mp", tmp = "tmp", mpl = "mpl";
			require("../templates/" + template).should.be.eql("test template");
			require("../templates/" + tmp + "l").should.be.eql("test template");
			require("../templates/t" + mpl).should.be.eql("test template");
			require("../templates/t" + mp + "l").should.be.eql("test template");
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

		it("should be able to require.resolve with automatical context", function() {
			var template = "tmpl";
			require.resolve("../templates/" + template).should.be.eql(require.resolve("../templates/tmpl"));
		});

		it("should resolve loaders relative to require", function() {
			var index = "index", test = "test";
			require("../loaders/queryloader?query!!!!../node_modules/subcontent/" + index + ".js").should.be.eql({
				resourceQuery: null,
				query: "?query",
				prev: "module.exports = \"error\";"
			});
			require("!../loaders/queryloader?query!../node_modules/subcontent/" + test + ".jade").should.be.eql({
				resourceQuery: null,
				query: "?query",
				prev: "xyz: abc"
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
				require("!json!../../../package.json").name.should.be.eql("webpack");
				require("../../../package.json").name.should.be.eql("webpack");
			});
			it("should handle the jade loader correctly", function() {
				require("!jade?self!../resources/template.jade")({abc: "abc"}).should.be.eql("<p>selfabc</p>");
				require("../resources/template.jade")({abc: "abc"}).should.be.eql("<p>abc</p>");
			});
			it("should handle the coffee loader correctly", function() {
				require("!coffee!../resources/script.coffee").should.be.eql("coffee test");
				require("../resources/script.coffee").should.be.eql("coffee test");
			});
			it("should handle the css loader correctly", function() {
				require("!css!../css/stylesheet.css").indexOf(".rule-direct").should.not.be.eql(-1);
				require("!css!../css/stylesheet.css").indexOf(".rule-import1").should.not.be.eql(-1);
				require("!css!../css/stylesheet.css").indexOf(".rule-import2").should.not.be.eql(-1);
			});
			it("should handle the val loader (piped with css loader) correctly", function() {
				require("!css!val!../css/generateCss").indexOf("generated").should.not.be.eql(-1);
				require("!css!val!../css/generateCss").indexOf(".rule-import2").should.not.be.eql(-1);
				require("!raw!val!../css/generateCss").indexOf("generated").should.not.be.eql(-1);
			});
			it("should handle the val loader (piped with css loader) correctly", function() {
				require("!raw!less!../less/stylesheet.less").indexOf(".less-rule-direct").should.not.be.eql(-1);
				require("!raw!less!../less/stylesheet.less").indexOf(".less-rule-import1").should.not.be.eql(-1);
				require("!raw!less!../less/stylesheet.less").indexOf(".less-rule-import2").should.not.be.eql(-1);
			});
			it("should handle the file loader correctly", function() {
				require("!file!../img/image.png").should.match(/js\/.+\.png$/);
				document.getElementById("image").src = require("file?prefix=img/!../img/image.png");
			});
		});
	});

	describe("query", function() {
		it("should make different modules for query", function() {
			var a = require("./empty");
			var b = require("./empty?1");
			var c = require("./empty?2");
			should.exist(a);
			should.exist(b);
			should.exist(c);
			a.should.be.not.equal(b);
			a.should.be.not.equal(c);
			b.should.be.not.equal(c);
		});

		it("should pass query to loader", function() {
			var result = require("../loaders/queryloader?query!./a?resourcequery");
			result.should.be.eql({
				resourceQuery: "?resourcequery",
				query: "?query",
				prev: "module.exports = \"a\";"
			});
		});

		it("should pass query to loader without resource with resource query", function() {
			var result = require("../loaders/queryloader?query!?resourcequery");
			result.should.be.eql({
				resourceQuery: "?resourcequery",
				query: "?query",
				prev: null
			});
		});

		it("should pass query to loader without resource", function() {
			var result = require("../loaders/queryloader?query!");
			result.should.be.eql({
				query: "?query",
				prev: null
			});
		});

		it("should pass query to multiple loaders", function() {
			var result = require("../loaders/queryloader?query1!../loaders/queryloader?query2!./a?resourcequery");
			result.should.be.a("object");
			result.should.have.property("resourceQuery").be.eql("?resourcequery");
			result.should.have.property("query").be.eql("?query1");
			result.should.have.property("prev").be.eql("module.exports = " + JSON.stringify({
				resourceQuery: "?resourcequery",
				query: "?query2",
				prev: "module.exports = \"a\";"
			}));
		});

		it("should pass query to loader over context", function() {
			var test = "test";
			var result = require("../loaders/queryloader?query!../context-query-test/" + test);
			result.should.be.eql({
				resourceQuery: null,
				query: "?query",
				prev: "test content"
			});
		});

		it("should evaluate __dirname and __resourceQuery", function() {
			var result = require("../resourceQuery/index?" + __dirname);
			result.should.be.eql("?resourceQuery");
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

	describe("deduplication", function() {
		it("should load a duplicate module with different dependencies correctly", function() {
			var dedupe1 = require("./dedupe1");
			var dedupe2 = require("./dedupe2");
			dedupe1.should.be.eql("dedupe1");
			dedupe2.should.be.eql("dedupe2");
		});
	});

});
