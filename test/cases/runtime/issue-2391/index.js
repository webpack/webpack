it("should not have a require.onError function by default", function() {
	(typeof require.onError).should.be.eql("undefined"); // expected to fail in browsertests
});