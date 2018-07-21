import { value } from "./file";
import value2 from "./commonjs";

it("should auto-import multiple ES6 imported values on accept", function(done) {
	value.should.be.eql(1);
	value2.should.be.eql(10);
	module.hot.accept(["./file", "./commonjs"], function() {
		value.should.be.eql(2);
		value2.should.be.eql(20);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	value.should.be.eql(2);
	value2.should.be.eql(20);
}
