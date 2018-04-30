it("should check existing variables when renaming", function() {
	require("./module").d.x().should.be.eql("ok");
	require("./module").c.a().should.be.eql("ok");
	require("./module").test().should.be.eql("ok");
});
