it("should resolve module dependencies recursively", function() {
	require("!./loaders/index!a").should.be.eql("c");
});
