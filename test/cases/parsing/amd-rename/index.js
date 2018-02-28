it("should name require in define correctly", function() {
	define(["require"], function(require) {
		(typeof require).should.be.eql("function");
	});
});
