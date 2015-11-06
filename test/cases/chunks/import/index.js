it("should be able to use System.import", function(done) {
	System.import("./two").then(function(two) {
		two.should.be.eql(2);
		done();
	}).catch(function(err) {
		done(err);
	});
});
