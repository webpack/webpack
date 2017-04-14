it("should watch for changes", function() {
	require("./changing-file").should.be.eql(WATCH_STEP);
})
