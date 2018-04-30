import value1 from "./module?(";
import value2 from "./module?)";
import value3 from "./module?[";
import value4 from "./module?]";
import value5 from "./module?{";
import value6 from "./module?}";

it("should not break on name conflicts", function() {
	value1.should.be.eql("a");
	value2.should.be.eql("a");
	value3.should.be.eql("a");
	value4.should.be.eql("a");
	value5.should.be.eql("a");
	value6.should.be.eql("a");
});
