it("should combine two chunk if too small", done => {
	// b should not yet available
	var bf = __webpack_modules__[require.resolveWeak("./b")];
	(typeof bf).should.be.eql("undefined");

	// load a
	import("./a").then(a => {
		a.default.should.be.eql("a");
		// check if b is available too
		var bf = __webpack_modules__[require.resolveWeak("./b")];
		(typeof bf).should.be.eql("function");

		// load b (just to check if it's ok)
		import("./b").then(b => {
			b.default.should.be.eql("b");
			done();
		}).catch(done);
	}).catch(done);
});
