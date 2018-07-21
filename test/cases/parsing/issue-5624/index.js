import { fn } from "./module";

it("should allow conditionals as callee", function() {
	var x = (true ? fn : fn)();
	x.should.be.eql("ok");
});
