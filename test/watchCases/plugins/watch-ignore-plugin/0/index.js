import value from "./file"
import a from "./a"
it("should ignore change to file", function() {
	a.should.be.eql(+WATCH_STEP);
	value.should.be.eql(1);
});
