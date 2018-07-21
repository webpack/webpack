it("should have a require.onError function by default", function() {
	(typeof require.onError).should.be.eql("function");
	require(["./file"]);
});