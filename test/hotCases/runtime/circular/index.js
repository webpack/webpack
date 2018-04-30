import a from "./a";

it("should not throw on circular dependencies", function(done) {
	a.should.be.eql(1);
	module.hot.accept("./a", function() {
		a.should.be.eql(2);
		done();
	});
	NEXT(require("../../update")(done));
});
