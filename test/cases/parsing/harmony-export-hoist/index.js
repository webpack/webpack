"use strict";

it("should hoist exports", function() {
	var result = require("./foo").default;
	(typeof result.foo).should.have.eql("function");
	(typeof result.foo2).should.have.eql("function");
	expect(result.foo()).toBe("ok");
	expect(result.foo2()).toBe("ok");
});
