import a from "./a";
import b from "./b";

it("should abort when module is not accepted", function(done) {
	a.should.be.eql(2);
	b.should.be.eql(1);
	NEXT(require("../../update")(function(err) {
		try {
			err.message.should.match(/Aborted because \.\/c\.js is not accepted\nUpdate propagation: \.\/c\.js -> \.\/b\.js -> \.\/index\.js/);
			done();
		} catch(e) { done(e); }
	}));
});
