it("should be able to rename require by var", function() {
	var cjsRequire; // just to make it difficult
	var cjsRequire = require, cjsRequire2 = typeof require !== "undefined" && require;
	expect(cjsRequire("./file")).toEqual("ok");
	expect(cjsRequire2("./file")).toEqual("ok");
});

it("should be able to rename require by assign", function() {
	var cjsRequire, cjsRequire2;
	(function() {
		cjsRequire = require;
		cjsRequire2 = typeof require === "function" && require;
		expect(cjsRequire("./file")).toEqual("ok");
		expect(cjsRequire2("./file")).toEqual("ok");
	}());
});

it("should be able to rename require by IIFE", function() {
	(function(cjsRequire) {
		expect(cjsRequire("./file")).toEqual("ok");
	}(require));
});

it("should be able to rename require by IIFE call", function() {
	(function(somethingElse, cjsRequire) {
		expect(cjsRequire("./file")).toEqual("ok");
		expect(somethingElse).toEqual(123);
	}.call(this, 123, typeof require === "function" ? require : "error"));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _exports2, _module, _module2, _define, _define2, _require, _require2) {
		_define(function(R, E, M) {
			expect(R("./file")).toEqual("ok");
			expect(_require("./file")).toEqual("ok");
			expect(_require2("./file")).toEqual("ok");
			expect(E).toEqual(exports);
			expect(_exports).toEqual(exports);
			expect(_exports2).toEqual(exports);
			expect(M).toEqual(module);
			expect(_module).toEqual(module);
			expect(_module2).toEqual(module);
		});
		_define2(["./file"], function(file) {
			expect(file).toEqual("ok");
		});
	}).call(this,
			typeof exports !== 'undefined' ? exports : null,
			exports,
			typeof module !== 'undefined' ? module : null,
			module,
			typeof define !== 'undefined' ? define : null,
			define,
			typeof require !== 'undefined' ? require : null,
			require);
});

it("should accept less parameters in a IIFE call", function() {
	(function(r, require) {
		expect(r("./file")).toEqual("ok");
		expect((typeof require)).toEqual("undefined");
	}(require));
});

it("should accept more parameters in a IIFE call", function() {
	(function() {
	}(require));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _module, _define, _require) {
		_define(function(R, E, M) {
			expect(R("./file")).toEqual("ok");
			expect(_require("./file")).toEqual("ok");
			expect(E).toEqual(exports);
			expect(_exports).toEqual(exports);
			expect(M).toEqual(module);
			expect(_module).toEqual(module);
		});
	}).call(this,
			typeof exports !== 'undefined' ? exports : null,
			typeof module !== 'undefined' ? module : null,
			typeof define !== 'undefined' ? define : null,
			typeof require !== 'undefined' ? require : null);
});

