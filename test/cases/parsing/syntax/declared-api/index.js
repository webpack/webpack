it("declared-api: should not replace declared variables", () => {
	expect(require("./module")).toBe(42 + 42);
});
