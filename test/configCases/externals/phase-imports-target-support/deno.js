it("should infer both phases from a deno target that reads them", () => {
	expect(__DEFER_IMPORT__).toBe(true);
	expect(__SOURCE_IMPORT__).toBe(true);
});
