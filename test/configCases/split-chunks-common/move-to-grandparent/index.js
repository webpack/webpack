it("should correctly include indirect children in common chunk", function(done) {
	Promise.all([
		import('./pageA'),
		import('./pageB')
	]).then((imports) => {
		expect(imports[0].default).toBe("reuse");
		expect(imports[1].default).toBe("reuse");
		done();
	}).catch(e => {
		done(e);
	})
});
