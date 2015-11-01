var value = require("./parent-file");

it("should bubble update from a nested dependency", function(done) {
	value.should.be.eql(1);
	module.hot.accept("./parent-file", function() {
		value = require("./parent-file");
		value.should.be.eql(2);
		done();
	});
	NEXT(require("../../update")(done));
});
