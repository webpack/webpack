it("should load only one instance with dedupeInstance option set", function (done) {
	require(["./a/dedupe", "./b/dedupe"], function(a, b) {
        a.should.be.eql(b);
		done();
	})
});
