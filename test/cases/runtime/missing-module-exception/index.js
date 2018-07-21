it("should have correct error code", function() {
	try {
		require("./fail");
	} catch(e) {
		e.code.should.be.eql("MODULE_NOT_FOUND");
	}
});