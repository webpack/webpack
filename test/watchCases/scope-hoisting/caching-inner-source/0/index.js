it("should not crash when scope-hoisted modules change", function() {
	require("./module").default.should.be.eql(WATCH_STEP);
})
