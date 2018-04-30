import { log } from "pmodule/tracker";
import { a, z } from "pmodule";

it("should not evaluate an immediate module", function() {
	a.should.be.eql("a");
	z.should.be.eql("z");
	log.should.be.eql(["a.js", "c.js"]);
});
