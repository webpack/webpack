it("should handle reference to entry chunk correctly", function(done) {
	import(/* webpackChunkName: "main" */"./module-a").then(function(result) {
		result.default.should.be.eql("ok");
		done();
	}).catch(function(e) {
		done(e);
	});
});
