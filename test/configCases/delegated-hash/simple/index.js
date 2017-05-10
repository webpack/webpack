it("should delegate the modules", function() {
	require("./a").should.be.eql("a");
	require("./loader!./b").should.be.eql("b");
	require("./dir/c").should.be.eql("c");
});
