import * as M from "./module";

it("should allow conditionals as callee", function() {
	var x = (true ? M.fn : M.fn)();
	x.should.be.eql("ok");
});

it("should allow conditionals as object", function() {
	var x = (true ? M : M).fn();
	x.should.be.eql("ok");
});
