it("should be able to rename require by var", function() {
	var cjsRequire; // just to make it difficult
	var cjsRequire = require, cjsRequire2 = typeof require !== "undefined" && require;
	cjsRequire("./file").should.be.eql("ok");
	cjsRequire2("./file").should.be.eql("ok");
});

it("should be able to rename require by assign", function() {
	var cjsRequire, cjsRequire2;
	(function() {
		cjsRequire = require;
		cjsRequire2 = typeof require === "function" && require;
		cjsRequire("./file").should.be.eql("ok");
		cjsRequire2("./file").should.be.eql("ok");
	}());
});

it("should be able to rename require by IIFE", function() {
	(function(cjsRequire) {
		cjsRequire("./file").should.be.eql("ok");
	}(require));
});

it("should be able to rename require by IIFE call", function() {
	(function(somethingElse, cjsRequire) {
		cjsRequire("./file").should.be.eql("ok");
		somethingElse.should.be.eql(123);
	}.call(this, 123, typeof require === "function" ? require : "error"));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _exports2, _module, _module2, _define, _define2, _require, _require2) {
		_define(function(R, E, M) {
			R("./file").should.be.eql("ok");
			_require("./file").should.be.eql("ok");
			_require2("./file").should.be.eql("ok");
			E.should.be.eql(exports);
			_exports.should.be.eql(exports);
			_exports2.should.be.eql(exports);
			M.should.be.eql(module);
			_module.should.be.eql(module);
			_module2.should.be.eql(module);
		});
		_define2(["./file"], function(file) {
			file.should.be.eql("ok");
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
		r("./file").should.be.eql("ok");
		(typeof require).should.be.eql("undefined");
	}(require));
});

it("should accept more parameters in a IIFE call", function() {
	(function() {
	}(require));
});

it("should be able to rename stuff by IIFE call", function() {
	(function(_exports, _module, _define, _require) {
		_define(function(R, E, M) {
			R("./file").should.be.eql("ok");
			_require("./file").should.be.eql("ok");
			E.should.be.eql(exports);
			_exports.should.be.eql(exports);
			M.should.be.eql(module);
			_module.should.be.eql(module);
		});
	}).call(this,
			typeof exports !== 'undefined' ? exports : null,
			typeof module !== 'undefined' ? module : null,
			typeof define !== 'undefined' ? define : null,
			typeof require !== 'undefined' ? require : null);
});

