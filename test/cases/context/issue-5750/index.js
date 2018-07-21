it("should not use regexps with the g flag", function() {
	require.context("./folder", true, /a/).keys().length.should.be.eql(1);
	require.context("./folder", true, /a/g).keys().length.should.be.eql(0);
});
