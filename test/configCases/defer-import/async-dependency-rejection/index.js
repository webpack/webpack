// A rejected async dependency is "done", so its error must still reach every
// deferred import of the same subgraph, not just the one that started it.
it("should reject every importer of a failed deferred async dependency", async () => {
	await expect(import("./first.js")).rejects.toThrow("boom");
	await expect(import("./second.js")).rejects.toThrow("boom");
});
