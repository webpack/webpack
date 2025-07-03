
 it("multiple inlined modules should be wrapped in IIFE to isolate from other inlined modules and chunk modules", () => {
	expect(typeof value).toBe("undefined"); // `value` in index2 should not leak to index1
});
