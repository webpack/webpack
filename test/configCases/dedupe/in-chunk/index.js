it("should allow to dedupe only in a chunk", function (done) {
	require(["./a/dedupe", "./b/dedupe"], function(a, b) {
		a.should.be.eql({ok: 1});
		b.should.be.eql({ok: 1});
		a.should.be.not.equal(b);
		done();
	})
});
