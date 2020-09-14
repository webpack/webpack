/**! Main */

it("should fail loading a deleted asset", async () => {
	await expect(import("./chunk.js")).rejects.toEqual(
		expect.objectContaining({
			code: "ENOENT"
		})
	);
});
