it("should load circular dependencies correctly", function() {
	require("./circular").should.be.eql(1);
});
