it("should parse fancy function calls with arrow functions", function() {
	("function"==typeof define && define.amd ?
		define :
		(e,t) => {return t()}
	)(["./constructor"], (c) => {
		return new c(1324);
	});
	expect(module.exports).toHaveProperty("value", 1324);
	(("function"==typeof define && define.amd ?
		define :
		(e,t) => {return t()}
	)(["./constructor"], (c) => {
		return new c(4231);
	}));
	expect(module.exports).toHaveProperty("value", 4231);
});

it("should parse fancy AMD calls with arrow functions", function() {
	require("./constructor ./a".split(" "));
	require("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), (require, module, exports, constructor, a) => {
		expect((typeof require)).toBe("function");
		expect((typeof module)).toBe("object");
		expect((typeof exports)).toBe("object");
		expect((typeof require("./constructor"))).toBe("function");
		expect((typeof constructor)).toBe("function");
		expect(a).toBe("a");
	});
	define("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), (require, module, exports, constructor, a) => {
		expect((typeof require)).toBe("function");
		expect((typeof module)).toBe("object");
		expect((typeof exports)).toBe("object");
		expect((typeof require("./constructor"))).toBe("function");
		expect((typeof constructor)).toBe("function");
		expect(a).toBe("a");
	});
});

it("should be able to use AMD-style require with arrow functions", function(done) {
	var template = "b";
	require(["./circular", "./templates/" + template, true ? "./circular" : "fail"], (circular, testTemplate, circular2) => {
		expect(circular).toBe(1);
		expect(circular2).toBe(1);
		expect(testTemplate).toBe("b");
		done();
	});
});

it("should be able to use require.js-style define with arrow functions", function(done) {
	define("name", ["./circular"], (circular) => {
		expect(circular).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, optional dependencies, not exist, with arrow function", function(done) {
	define("name", ["./optional"], (optional) => {
		expect(optional.b).toBeFalsy();
		done();
	});
});

it("should be able to use require.js-style define, special string, with arrow function", function(done) {
	define(["require"], (require) => {
		expect(require("./circular")).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, without name, with arrow function", function(done) {
	true && define(["./circular"], (circular) => {
		expect(circular).toBe(1);
		done();
	});
});

it("should be able to use require.js-style define, with empty dependencies, with arrow function", function(done) {
	define("name", [], () => {
		done();
	});
});

it("should be able to use require.js-style define, without dependencies, with arrow function", function(done) {
	true && define("name", () => {
		done();
	});
});

it("should offer AMD-style define for CommonJs with arrow function", function(done) {
	var _test_exports = exports;
	var _test_module = module;
	define((require, exports, module) => {
		expect((typeof require)).toBe("function");
		expect(exports).toBe(_test_exports);
		expect(module).toBe(_test_module);
		expect(require("./circular")).toBe(1);
		done();
	});
});

it("should pull in all dependencies of an AMD module with arrow function", function(done) {
	define((require) => {
		expect(require("./amdmodule")).toBe("a");
		done();
	});
});

it("should create a chunk for require.js require, with arrow function", function(done) {
	var sameTick = true;
	require(["./c"], (c) => {
		expect(sameTick).toBe(false);
		expect(c).toBe("c");
		expect(require("./d")).toBe("d");
		done();
	});
	sameTick = false;
});
