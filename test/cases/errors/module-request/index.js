it("should not resolve module requests relative", async () => {
	await expect(import("./module.mjs")).rejects.toMatchObject({
		code: "MODULE_NOT_FOUND"
	});
});
