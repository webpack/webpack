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
require("./stylesheet.css");
require("./stylesheet.less");

var should = require("should");
if(!should.exist) should.exist = function(x) { should.strictEqual(x === undefined, false); should.strictEqual(x === null, false); }

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
	
	var testCasesContext = require.context("../../cases", true, /^\.\/[^\/_]+\/[^\/_]+\/index$/);
	var testCasesMap = testCasesContext.keys().map(function(key) {
		return key.substring(2, key.length - "/index".length).split("/");
	}).reduce(function(map, x) {
		if(!map[x[0]]) map[x[0]] = [x[1]];
		else map[x[0]].push(x[1]);
		return map;
	}, {});
	Object.keys(testCasesMap).forEach(function(category) {
		describe(category, function() {
			testCasesMap[category].forEach(function(name) {
				describe(name, function() {
					testCasesContext("./" + category + "/" + name + "/index");
				});
			});
		});
	});

	describe("web resolving", function() {
		it("should load index.web.js instead of index.js", function() {
			true.should.be.eql(true);
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

	describe("web runtime", function() {
		it("should have support for require.main", function() {
			var value = require.main === module;
			var otherModuleValue = require("./testRequireMain");
			value.should.be.eql(true);
			otherModuleValue.should.be.eql(false);
		});
	});

	describe("web polyfilling", function() {
		var sum2;

		before(function() {
			sum2 = 0;
		});

		it("should polyfill process and module", function(done) {
			module.id.should.have.type("number");
			require.ensure([], function(require) {
				test(Array.isArray(process.argv), "process.argv should be an array");
				process.nextTick(function() {
					sum2++;
					sum2.should.be.eql(2);
					done();
				});
				sum2++;
				test(global === window, "global === window");
			});
		});
	});

	describe("web loaders", function() {
		it("should handle the file loader correctly", function() {
			require("!file!../img/image.png").should.match(/js\/.+\.png$/);
			document.getElementById("image").src = require("file?prefix=img/!../img/image.png");
		});
	});

});

if(module.hot) {
	module.hot.accept();
	module.hot.dispose(function() {
		mocha.suite.suites.length = 0;
		var stats = document.getElementById("stats");
		stats.parentNode.removeChild(stats);
	});
	if(module.data) {
		mocha.run();
	}
}
