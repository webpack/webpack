/**! Main */

it("should handle asset deletion correctly during compression", async () => {
	const { default: add } = await import("./chunk.js");
	expect(add(1, 2)).toBe(3);
});

it("should not fail when accessing compressed assets", async () => {
	await expect(import("./chunk.js")).resolves.toBeDefined();
}); 