var value = require("./file");

it("should accept a dependencies multiple times", function(done) {
	value.should.be.eql(1);
	module.hot.accept("./file", function() {
		var oldValue = value;
		value = require("./file");
		value.should.be.eql(oldValue + 1);
		if(value < 4)
			NEXT(require("../../update")(done));
		else
			done();
	});
	NEXT(require("../../update")(done));
});
