it("should infer both phases for a concatenating deno build", () => {
	expect(__DEFER_IMPORT__).toBe(true);
	expect(__SOURCE_IMPORT__).toBe(true);
});
