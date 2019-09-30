it("should compile", function(done) {
	done();
});

it("should disable define", function(done) {
	expect(typeof define).toBe('undefined')
	done()
})
