it("should have correct error code", function() {
	try {
		require("./fail");
	} catch(e) {
		expect(e.code).toBe("MODULE_NOT_FOUND");
	}
});
