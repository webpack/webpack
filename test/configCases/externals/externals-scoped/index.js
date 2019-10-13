it("should not fail compilation code with scoped external", function(done) {
	// eslint-disable-next-line node/no-missing-require
	require("@scoped/package");
	done();
});
