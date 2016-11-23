import a from "./a";
import get from "./b";

var options = { ignoreUnaccepted: true };

it("should ignore unaccepted module updates", function(done) {
	function waitForUpdate(fn) {
		NEXT(require("../../update")(done, options, fn));
	}

	a.should.be.eql(2);
	get().should.be.eql(1);
	waitForUpdate(function() {
		a.should.be.eql(2);
		get().should.be.eql(1);
		waitForUpdate(function() {
			a.should.be.eql(2);
			get().should.be.eql(2);
			waitForUpdate(function() {
				a.should.be.eql(2);
				get().should.be.eql(3);
				done();
			});
		});
	});
});
