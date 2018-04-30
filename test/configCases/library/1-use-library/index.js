import d from "library";
import { a, b, external } from "library";

it("should be able to import harmony exports from library (" + NAME + ")", function() {
	d.should.be.eql("default-value");
	a.should.be.eql("a");
	b.should.be.eql("b");
	if(typeof TEST_EXTERNAL !== "undefined" && TEST_EXTERNAL) {
		external.should.be.eql(["external"]);
		external.should.be.equal(require("external"));
	} else {
		external.should.be.eql("non-external");
	}
});
