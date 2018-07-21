"use strict";

it("should hoist exports", function() {
	var result = require("./foo").default;
	(typeof result.foo).should.have.eql("function");
	(typeof result.foo2).should.have.eql("function");
	result.foo().should.be.eql("ok");
	result.foo2().should.be.eql("ok");
});
