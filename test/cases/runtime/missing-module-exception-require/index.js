it("should have correct error code", function () {
	try {
		require("./fail-1");
		require("./fail-2").property;
		require("./fail-3").property.sub();
	} catch (e) {
		expect(e.code).toBe("MODULE_NOT_FOUND");
	}
});
