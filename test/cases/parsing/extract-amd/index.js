it("should parse fancy function calls", function() {
	("function"==typeof define && define.amd ?
		define :
		function(e,t){return t()}
	)(["./constructor"], function(c) {
		return new c(1324);
	});
	expect(module.exports).toHaveProperty("value", 1324);
	(("function"==typeof define && define.amd ?
		define :
		function(e,t){return t()}
	)(["./constructor"], function(c) {
		return new c(4231);
	}));
	expect(module.exports).toHaveProperty("value", 4231);
});

it("should parse fancy AMD calls", function() {
	require("./constructor ./a".split(" "));
	require("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), function(require, module, exports, constructor, a) {
		expect((typeof require)).toBe("function");
		expect((typeof module)).toBe("object");
		expect((typeof exports)).toBe("object");
		expect((typeof require("./constructor"))).toBe("function");
		expect((typeof constructor)).toBe("function");
		expect(a).toBe("a");
	});
	define("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), function(require, module, exports, constructor, a) {
		expect((typeof require)).toBe("function");
		expect((typeof module)).toBe("object");
		expect((typeof exports)).toBe("object");
		expect((typeof require("./constructor"))).toBe("function");
		expect((typeof constructor)).toBe("function");
		expect(a).toBe("a");
	});
});

it("should be able to use AMD-style require", function(done) {
	var template = "b";
	require(["./circular", "./templates/" + template, true ? "./circular" : "fail"], function(circular, testTemplate, circular2) {
		expect(circular).toBe(1);
		expect(circular2).toBe(1);
		expect(testTemplate).toBe("b");
		done();
	});
});

it("should be able to use require.js-style define", function(done) {
	define("name", ["./circular"], function(circular) {
		expect(circular).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, optional dependencies, not exist", function(done) {
	define("name", ["./optional"], function(optional) {
		expect(optional.b).toBeFalsy();
		done();
	});
});

it("should be able to use require.js-style define, special string", function(done) {
	define(["require"], function(require) {
		expect(require("./circular")).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, without name", function(done) {
	true && define(["./circular"], function(circular) {
		expect(circular).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, with empty dependencies", function(done) {
	define("name", [], function() {
		done();
	});
});

it("should be able to use require.js-style define, with empty dependencies, with a expression", function(done) {
	define([], ok);
	function ok() { done() };
});

it("should be able to use require.js-style define, with empty dependencies, with a expression and name", function(done) {
	define("name", [], done);
});

it("should be able to use require.js-style define, without dependencies", function(done) {
	true && define("name", function() {
		done();
	});
});

it("should be able to use require.js-style define, without dependencies, with a expression", function(done) {
	true && define("name", ok);
	function ok() { done() };
});

var obj = {};
it("should be able to use require.js-style define, with an object", function() {
	module.exports = null;

	true && define("blaaa", obj);

	expect(module.exports).toBe(obj);
	module.exports = null;

	define("blaaa", obj);

	expect(module.exports).toBe(obj);
	module.exports = null;
});

it("should offer AMD-style define for CommonJs", function(done) {
	var _test_exports = exports;
	var _test_module = module;
	define(function(require, exports, module) {
		expect((typeof require)).toBe("function");
		expect(exports).toBe(_test_exports);
		expect(module).toBe(_test_module);
		expect(require("./circular")).toBe(1);
		done();
	});
});

it("should not crash on require.js require only with array", function() {
	require(["./circular"]);
});

it("should be able to use AMD require without function expression (empty array)", function(done) {
	require([], ok);
	function ok() { done() };
});

it("should be able to use AMD require without function expression", function(done) {
	require(["./circular"], fn);
	function fn(c) {
		expect(c).toBe(1);
		done();
	}
});

it("should create a chunk for require.js require", function(done) {
	var sameTick = true;
	require(["./c"], function(c) {
		expect(sameTick).toBe(false);
		expect(c).toBe("c");
		expect(require("./d")).toBe("d");
		done();
	});
	sameTick = false;
});

it("should not fail #138", function(done) {
	(function (factory) {
		if (typeof define === 'function' && define.amd) {
			define([], factory); // AMD
		} else if (typeof exports === 'object') {
			module.exports = factory(); // Node
		} else {
			factory(); // Browser global
		}
	}(function () { done() }));
});

it("should parse a bound function expression 1", function(done) {
	define(function(a, require, exports, module) {
		expect(a).toBe(123);
		expect((typeof require)).toBe("function");
		expect(require("./a")).toBe("a");
		done();
	}.bind(null, 123));
});

it("should parse a bound function expression 2", function(done) {
	define("name", function(a, require, exports, module) {
		expect(a).toBe(123);
		expect((typeof require)).toBe("function");
		expect(require("./a")).toBe("a");
		done();
	}.bind(null, 123));
});

it("should parse a bound function expression 3", function(done) {
	define(["./a"], function(number, a) {
		expect(number).toBe(123);
		expect(a).toBe("a");
		done();
	}.bind(null, 123));
});

it("should parse a bound function expression 4", function(done) {
	define("name", ["./a"], function(number, a) {
		expect(number).toBe(123);
		expect(a).toBe("a");
		done();
	}.bind(null, 123));
});

it("should not fail issue #138 second", function() {
	(function(define, global) { 'use strict';
		define(function (require) {
			expect((typeof require)).toBe("function");
			expect(require("./a")).toBe("a");
			return "#138 2.";
		});
	})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }, this);
	expect(module.exports).toBe("#138 2.");
});

it("should parse an define with empty array and object", function() {
	var obj = {ok: 95476};
	define([], obj);
	expect(module.exports).toBe(obj);
});
it("should parse an define with object", function() {
	var obj = {ok: 76243};
	define(obj);
	expect(module.exports).toBe(obj);
});
