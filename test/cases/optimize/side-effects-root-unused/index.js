import { log } from "pmodule/tracker";
import { a, x, z } from "pmodule";

it("should evaluate all modules", function() {
	a.should.be.eql("a");
	x.should.be.eql("x");
	z.should.be.eql("z");
	log.should.be.eql(["a.js", "b.js", "c.js"]);
});
