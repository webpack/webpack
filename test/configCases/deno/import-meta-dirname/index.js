it("should keep native import.meta.dirname/filename for deno >= 1.40", () => {
	expect(typeof import.meta.dirname).toBe("string");
	expect(typeof import.meta.filename).toBe("string");
});
