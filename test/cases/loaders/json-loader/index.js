it("should handle the json loader correctly", function() {
	require("!json!../../../../package.json").name.should.be.eql("webpack");
	require("../../../../package.json").name.should.be.eql("webpack");
});
