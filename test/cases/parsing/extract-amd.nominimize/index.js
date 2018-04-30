var should = require("should");

it("should parse fancy function calls with arrow functions", function() {
	("function"==typeof define && define.amd ?
		define :
		(e,t) => {return t()}
	)(["./constructor"], (c) => {
		return new c(1324);
	});
	module.exports.should.have.property("value").be.eql(1324);
	(("function"==typeof define && define.amd ?
		define :
		(e,t) => {return t()}
	)(["./constructor"], (c) => {
		return new c(4231);
	}));
	module.exports.should.have.property("value").be.eql(4231);
});

it("should parse fancy AMD calls with arrow functions", function() {
	require("./constructor ./a".split(" "));
	require("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), (require, module, exports, constructor, a) => {
		(typeof require).should.be.eql("function");
		(typeof module).should.be.eql("object");
		(typeof exports).should.be.eql("object");
		(typeof require("./constructor")).should.be.eql("function");
		(typeof constructor).should.be.eql("function");
		a.should.be.eql("a");
	});
	define("-> module module exports *constructor *a".replace("module", "require").substr(3).replace(/\*/g, "./").split(" "), (require, module, exports, constructor, a) => {
		(typeof require).should.be.eql("function");
		(typeof module).should.be.eql("object");
		(typeof exports).should.be.eql("object");
		(typeof require("./constructor")).should.be.eql("function");
		(typeof constructor).should.be.eql("function");
		a.should.be.eql("a");
	});
});

it("should be able to use AMD-style require with arrow functions", function(done) {
	var template = "b";
	require(["./circular", "./templates/" + template, true ? "./circular" : "fail"], (circular, testTemplate, circular2) => {
		circular.should.be.eql(1);
		circular2.should.be.eql(1);
		testTemplate.should.be.eql("b");
		done();
	});
});

it("should be able to use require.js-style define with arrow functions", function(done) {
	define("name", ["./circular"], (circular) => {
		circular.should.be.eql(1);
		done();
	});
});

it("should be able to use require.js-style define, optional dependencies, not exist, with arrow function", function(done) {
	define("name", ["./optional"], (optional) => {
		should(optional.b).not.exist;
		done();
	});
});

it("should be able to use require.js-style define, special string, with arrow function", function(done) {
	define(["require"], (require) => {
		require("./circular").should.be.eql(1);
		done();
	});
});

it("should be able to use require.js-style define, without name, with arrow function", function(done) {
	true && define(["./circular"], (circular) => {
		circular.should.be.eql(1);
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
		(typeof require).should.be.eql("function");
		exports.should.be.equal(_test_exports);
		module.should.be.equal(_test_module);
		require("./circular").should.be.eql(1);
		done();
	});
});

it("should pull in all dependencies of an AMD module with arrow function", function(done) {
	define((require) => {
		require("./amdmodule").should.be.eql("a");
		done();
	});
});

it("should create a chunk for require.js require, with arrow function", function(done) {
	var sameTick = true;
	require(["./c"], (c) => {
		sameTick.should.be.eql(false);
		c.should.be.eql("c");
		require("./d").should.be.eql("d");
		done();
	});
	sameTick = false;
});
