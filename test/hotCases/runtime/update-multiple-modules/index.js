var value = require("./parent-file");

it("should update multiple modules at the same time", function(done) {
	value.should.be.eql(2);
	module.hot.accept("./parent-file", function() {
		value = require("./parent-file");
		value.should.be.eql(4);
		done();
	});
	NEXT(require("../../update")(done));
});
