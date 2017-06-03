it("should correctly export stuff from not parsed modules", function() {
	require("./not-parsed-a").should.be.eql("ok");
	require("./not-parsed-b").should.be.eql("ok");
});
