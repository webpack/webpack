import { log } from "pmodule/tracker";
import { a } from "pmodule";

it("should not evaluate a chain of modules", function() {
	a.should.be.eql("a");
	log.should.be.eql(["a.js"]);
});
