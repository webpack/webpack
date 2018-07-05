function test(cond, message) {
	if(!cond) throw new Error(message);
}

// load tests from library1, with script loader
require("script-loader!../js/library1.js");

// Buildin 'style' loader adds css to document
require("./stylesheet.css");
require("./stylesheet.less");

describe("main", function() {
	it("should load library1 with script-loader", function() {
		expect(window.library1).toEqual(expect.anything());
		expect(window.library1).toBe(true);
	});

	it("should load library2 exported as global", function() {
		expect(window.library2common).toEqual(expect.anything());
		expect(window.library2common.ok2).toEqual(expect.anything());
		expect(window.library2common.ok2).toBe(true);
		expect(window.library2).toEqual(expect.anything());
		expect(window.library2.ok).toEqual(expect.anything());
		expect(window.library2.ok).toBe(true);
	});

	describe("web resolving", function() {
		it("should load index.web.js instead of index.js", function() {
			expect(true).toBe(true);
		});

		it("should load correct replacements for files", function(done) {
			require.ensure(["subcontent"], function(require) {
				// Comments work!
				exports.ok = true;
				test(require("subcontent") === "replaced", "node_modules should be replaced with web_modules");
				test(require("subcontent2/file.js") === "original", "node_modules should still work when web_modules exists");
				done();
			});
		});

		after(function() {
			expect(exports.ok).toEqual(expect.anything());
			expect(exports.ok).toBe(true);
		});
	});

	describe("web runtime", function() {
		it("should have support for require.main", function() {
			var value = require.main === module;
			var otherModuleValue = require("./testRequireMain");
			expect(value).toBe(true);
			expect(otherModuleValue).toBe(false);
		});
	});

	describe("web polyfilling", function() {
		var sum2;

		before(function() {
			sum2 = 0;
		});

		it("should polyfill process and module", function(done) {
			expect(typeof module.id).toBe("number");
			require.ensure([], function(require) {
				test(Array.isArray(process.argv), "process.argv should be an array");
				process.nextTick(function() {
					sum2++;
					expect(sum2).toBe(2);
					done();
				});
				sum2++;
				test(global === window, "global === window");
			});
		});
	});

	describe("web loaders", function() {
		it("should handle the file loader correctly", function() {
			expect(require("!file-loader!../img/image.png")).toMatch(/js\/.+\.png$/);
			document.getElementById("image").src = require("file-loader?prefix=img/!../img/image.png");
		});
	});

	describe("chunk error handling", function() {
		it("should be able to handle chunk loading errors and try again", function(done) {
			var old = __webpack_public_path__;
			__webpack_public_path__ += "wrong/";
			import("./three").then(function() {
				done(new Error("Chunk shouldn't be loaded"));
			}).catch(function(err) {
				expect(err).toBeInstanceOf(Error);
				__webpack_public_path__ = old;
				import("./three").then(function(three) {
					expect(three).toBe(3);
					done();
				}).catch(function(err) {
					done(new Error("Shouldn't result in an chunk loading error"));
				});
			});
		});
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
