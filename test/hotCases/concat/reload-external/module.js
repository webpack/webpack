import value1 from "./a";
import value2 from "./b";

it("should allow to hot replace modules in a ConcatenatedModule", function(done) {
	value1.should.be.eql(1);
	value2.should.be.eql(10);
	module.hot.accept("./a", function() {
		value1.should.be.eql(2);
		NEXT(require("../../update")(done));
	});
	module.hot.accept("./b", function() {
		value2.should.be.eql(20);
		done();
	});
	NEXT(require("../../update")(done));
});
