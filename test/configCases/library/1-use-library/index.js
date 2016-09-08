import d from "library";
import { a, b } from "library";

it("should be able to import hamorny exports from library", function() {
	d.should.be.eql("default-value");
	a.should.be.eql("a");
	b.should.be.eql("b");
});