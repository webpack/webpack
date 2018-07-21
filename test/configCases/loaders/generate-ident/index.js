it("should correctly pass complex query object with remaining request", function() {
	require("./a").should.be.eql("ok");
	require("./b").should.be.eql("maybe");
	require("./c").should.be.eql("yes");
	require("./d").should.be.eql("ok");
});
