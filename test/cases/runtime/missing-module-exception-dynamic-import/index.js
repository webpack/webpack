it("should have correct error code", async function () {
	try {
		await import("./fail-1");
		await import("./fail-2").property;
		await import("./fail-3").property.sub();
	} catch (e) {
		expect(e.code).toBe("MODULE_NOT_FOUND");
	}
});
