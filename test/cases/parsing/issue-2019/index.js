it("should not fail on default export before export", function() {
	require("./file").default.should.be.eql("default");
	require("./file").CONSTANT.should.be.eql("const");
});