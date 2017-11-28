import value from "./file";

it("should auto-import a ES6 imported default value from non-harmony module on accept", function(done) {
	value.should.be.eql(1);
	module.hot.accept("./file", function() {
		value.should.be.eql(2);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	value.should.be.eql(2);
}
