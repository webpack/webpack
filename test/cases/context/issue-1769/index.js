it("should be able the catch a incorrect import", function(done) {
	var expr = "1";
	import("./folder/" + expr).then(function() {
		done(new Error("should not be called"));
	}).catch(function(err) {
		err.should.be.instanceof(Error);
		done();
	});
});
