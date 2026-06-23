// Bun supports import.meta.dirname/filename, so webpack keeps them native.
it("should keep native import.meta.dirname/filename for bun", () => {
	expect(typeof import.meta.dirname).toBe("string");
	expect(typeof import.meta.filename).toBe("string");
});
