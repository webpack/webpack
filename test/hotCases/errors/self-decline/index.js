import a from "./a";

it("should abort when module is declined by itself", function(done) {
	a.should.be.eql(1);
	NEXT(require("../../update")(function(err) {
		try {
			err.message.should.match(/Aborted because of self decline: \.\/a\.js\nUpdate propagation: \.\/c\.js -> \.\/b\.js -> \.\/a\.js/);
			done();
		} catch(e) { done(e); }
	}));
});
