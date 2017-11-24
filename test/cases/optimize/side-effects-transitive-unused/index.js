import { log } from "pmodule/tracker";
import { a, y } from "pmodule";

it("should not evaluate a reexporting transitive module", function() {
	a.should.be.eql("a");
	y.should.be.eql("y");
	log.should.be.eql(["a.js", "b.js"]);
});
