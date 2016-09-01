import { a } from "./a";
import x, { b } from "./b";
import { c, d } from "./fake-reexport";

it("should be able to use exported function", function() {
	a.should.be.eql("ok");
	b.should.be.eql("ok");
	x().should.be.eql("ok");
	c.should.be.eql("ok");
	d.should.be.eql("ok");
});
