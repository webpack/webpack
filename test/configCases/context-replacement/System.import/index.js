it("should replace a async context with a manual map", function(done) {
	var a = "a";
	System.import(a).then(function(a) {
		a.should.be.eql("b");
		done();
	});
});
