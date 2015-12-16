it("should complete", function(done) {
	require.ensure(["./a"], function(require) {
		require("./a").should.be.eql("a");
		done();
	});
});
