it("should not fail on optional externals", function() {
	try {
		require("external");
	} catch(e) {
		e.should.be.instanceof(Error);
		e.code.should.be.eql("MODULE_NOT_FOUND");
		return;
	}
	throw new Error("It doesn't fail");
});