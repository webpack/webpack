it("should not fail on optional externals", function() {
	require("external2");
	try {
		require("external");
	} catch(e) {
		expect(e).toBeInstanceOf(Error);
		expect(e.code).toBe("MODULE_NOT_FOUND");
		return;
	}
	throw new Error("It doesn't fail");
});
