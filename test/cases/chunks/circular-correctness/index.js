it("should handle circular chunks correctly", function(done) {
	import(/* webpackChunkName: "a" */"./module-a").then(function(result) {
		return result.default();
	}).then(function(result2) {
		result2.default().should.be.eql("x");
		done();
	}).catch(function(e) {
		done(e);
	});
	const couldBe = function() {
		return import(/* webpackChunkName: "b" */"./module-b");
	};
});
