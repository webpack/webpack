it("should infer only the source phase from a node target", () => {
	expect(__DEFER_IMPORT__).toBe(false);
	expect(__SOURCE_IMPORT__).toBe(true);
});
