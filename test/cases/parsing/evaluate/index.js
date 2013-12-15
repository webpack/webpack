it("should define DEBUG", function() {
	DEBUG.should.be.eql(false);
	(typeof DEBUG).should.be.eql("boolean");
	var x = require(DEBUG ? "fail" : "./a");
	var y = DEBUG ? require("fail") : require("./a");
});

it("should short-circut evaluating", function() {
	var expr;
	var a = DEBUG && expr ? require("fail") : require("./a");
	var b = !DEBUG || expr ? require("./a") : require("fail");
});

it("should evaluate __dirname and __resourceQuery with replace and substr", function() {
	var result = require("./resourceQuery/index?" + __dirname);
	result.should.be.eql("?resourceQuery");
});
