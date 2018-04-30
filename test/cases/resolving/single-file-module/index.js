it("should load single file modules", function() {
	require("subfilemodule").should.be.eql("subfilemodule");
});
