it("should reject with SyntaxError when source-importing a JS module dynamically", async () => {
	await expect(import.source("./module.js")).rejects.toBeInstanceOf(SyntaxError);
});

it("should reject with SyntaxError when indirectly importing a module that source-imports JS", async () => {
	await expect(import("./indirect.js")).rejects.toBeInstanceOf(SyntaxError);
});
