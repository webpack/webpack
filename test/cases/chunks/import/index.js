it("should be able to use import", function(done) {
	import("./two").then(function(two) {
		two.should.be.eql({ default: 2 });
		done();
	}).catch(function(err) {
		done(err);
	});
});
