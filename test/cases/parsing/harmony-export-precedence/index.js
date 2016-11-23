import { a, b, c, d, e } from "./a";

import defaultImport from "./a";

it("should prefer local exports", function() {
	a().should.be.eql("a1");
	e.should.be.eql("e1");
});

it("should prefer indirect exports over star exports", function() {
	b.should.be.eql("b2");
	d.should.be.eql("d2");
});

it("should use star exports", function() {
	c.should.be.eql("c3");
});

it("should not export default via star export", function() {
	(typeof defaultImport).should.be.eql("undefined");
});
