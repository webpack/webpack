import A from "./module";
import { B } from "./module";
import { c } from "./module";

it("should allow to export a class", function() {
	(typeof A).should.be.eql("function");
	(typeof B).should.be.eql("function");
	c.should.be.eql("c");
})