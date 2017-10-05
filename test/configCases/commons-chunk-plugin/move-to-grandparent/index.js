it("should correctly include indirect children in common chunk", function(done) {
	Promise.all([
		import('./pageA'),
		import('./pageB')
	]).then(([a, b]) => {
		a.default.should.be.eql("reuse");
		b.default.should.be.eql("reuse");
		done();
	}).catch(e => {
		done();
	})
});
