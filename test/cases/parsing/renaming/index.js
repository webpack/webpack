it("should be able to rename require by var", function() {
	var cjsRequire; // just to make it difficult
	var cjsRequire = require, cjsRequire2 = typeof require !== "undefined" && require;
	expect(cjsRequire("./file")).toBe("ok");
	expect(cjsRequire2("./file")).toBe("ok");
});

it("should be able to rename require by assign", function() {
	var cjsRequire, cjsRequire2;
	(function() {
		cjsRequire = require;
		cjsRequire2 = typeof require === "function" && require;
		expect(cjsRequire("./file")).toBe("ok");
		expect(cjsRequire2("./file")).toBe("ok");
	}());
});

it("should be able to rename require by IIFE", function() {
	(function(cjsRequire) {
		expect(cjsRequire("./file")).toBe("ok");
	}(require));
});

it("should be able to rename require by IIFE call", function() {
	(function(somethingElse, cjsRequire) {
		expect(cjsRequire("./file")).toBe("ok");
		expect(somethingElse).toBe(123);
	}.call(this, 123, typeof require === "function" ? require : "error"));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _exports2, _module, _module2, _define, _define2, _require, _require2) {
		_define(function(R, E, M) {
			expect(R("./file")).toBe("ok");
			expect(_require("./file")).toBe("ok");
			expect(_require2("./file")).toBe("ok");
			expect(E).toBe(exports);
			expect(_exports).toBe(exports);
			expect(_exports2).toBe(exports);
			expect(M).toBe(module);
			expect(_module).toBe(module);
			expect(_module2).toBe(module);
		});
		_define2(["./file"], function(file) {
			expect(file).toBe("ok");
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
		expect(r("./file")).toBe("ok");
		expect((typeof require)).toBe("undefined");
	}(require));
});

it("should accept more parameters in a IIFE call", function() {
	(function() {
	}(require));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _module, _define, _require) {
		_define(function(R, E, M) {
			expect(R("./file")).toBe("ok");
			expect(_require("./file")).toBe("ok");
			expect(E).toBe(exports);
			expect(_exports).toBe(exports);
			expect(M).toBe(module);
			expect(_module).toBe(module);
		});
	}).call(this,
			typeof exports !== 'undefined' ? exports : null,
			typeof module !== 'undefined' ? module : null,
			typeof define !== 'undefined' ? define : null,
			typeof require !== 'undefined' ? require : null);
});

