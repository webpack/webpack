var x = require("./module");

it("should allow to hot replace modules in a ConcatenatedModule", function(done) {
	x.should.be.eql({
		default: "ok1",
		__esModule: true
	});
	module.hot.accept("./module", function() {
		x = require("./module");
		x.should.be.eql({
			default: "ok2",
			__esModule: true
		});
		done();
	});
	NEXT(require("../../update")(done));
});
