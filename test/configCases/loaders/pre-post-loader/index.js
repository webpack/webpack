it("should apply pre and post loaders correctly", function() {
	require("./a").should.be.eql("resource loader2 loader1 loader3");
	require("!./a").should.be.eql("resource loader2 loader3");
	require("!!./a").should.be.eql("resource");
	require("-!./a").should.be.eql("resource loader3");
});
