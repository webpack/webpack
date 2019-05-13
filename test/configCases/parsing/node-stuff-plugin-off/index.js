it("should not evaluate __dirname or __filename when node option is false", function(done) {
	if (typeof __dirname !== "undefined") {
		done.fail();
	}
	if (typeof __filename !== "undefined") {
		done.fail();
	}
	done();
});
