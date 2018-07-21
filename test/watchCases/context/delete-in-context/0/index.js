it("should detect changes in a context", function() {
	var context = require.context("./directory");
	context.keys().length.should.be.eql((+WATCH_STEP) % 3 * 2);
});
