"use strict";

require("should");

it("should be able to use global in strict mode", function() {
	(typeof global).should.be.eql("object");
	(global === null).should.be.eql(false)
});
