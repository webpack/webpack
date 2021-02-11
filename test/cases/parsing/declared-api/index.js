it("should not replace declared variables", () => {
	expect(require("./module")).toBe(42 + 42);
});
