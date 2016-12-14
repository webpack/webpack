it("should escape require.context id correctly", function() {
	var context = require.context("./folder");
	context("./a").should.be.eql("a");
	context.id.should.be.type("string");
});
