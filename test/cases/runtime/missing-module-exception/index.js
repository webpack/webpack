it("should have correct error code", function() {
	try {
		require("./fail");
	} catch(e) {
		expect(e.code).toEqual("MODULE_NOT_FOUND");
	}
});