it("should be able to use import", function(done) {
	import("./two").then(function(two) {
		expect(two).toEqual({
			default: 2,
			[Symbol.toStringTag]: "Module"
		});
		done();
	}).catch(function(err) {
		done(err);
	});
});
