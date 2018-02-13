it("should correctly include indirect children in common chunk", function(done) {
	Promise.all([
		import('./pageA'),
		import('./pageB').then(m => m.default)
	]).then((imports) => {
		imports[0].default.should.be.eql("reuse");
		imports[1].default.should.be.eql("reuse");
		done();
	}).catch(e => {
		done(e);
	})
});
