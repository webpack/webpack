var value = require("./file");

it("should accept a dependencies and require a new value", function(done) {
	value.should.be.eql(1);
	module.hot.accept("./file", function() {
		value = require("./file");
		value.should.be.eql(2);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	value.should.be.eql(2);
}
