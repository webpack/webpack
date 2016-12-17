import a from "./loader!./a";

it("should abort when module is not accepted", function(done) {
	a.should.be.eql(1);
	NEXT(require("../../update")(done, {
		ignoreErrored: true
	}, function() {
		a.should.be.eql(1);
		NEXT(require("../../update")(done, {
			ignoreErrored: true
		}, function() {
			a.should.be.eql(3);
			done();
		}));
	}));
});

if(module.hot) {
	module.hot.accept("./loader!./a");
}
