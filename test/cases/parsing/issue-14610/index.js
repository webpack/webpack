it("should keep parentheses when replacing", () => {
	// prettier-ignore
	expect(new (require("./module")).Thing(42).property).toBe(42)
});
