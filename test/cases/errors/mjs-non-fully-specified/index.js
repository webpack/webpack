it("should not resolve without extension", async () => {
	await expect(import("./module.mjs")).rejects.toMatchObject({
		code: "MODULE_NOT_FOUND"
	});
});
