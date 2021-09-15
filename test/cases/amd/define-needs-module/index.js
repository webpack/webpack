it("should have runtime requirement on module with define", () => {
	expect(require("./module")).toBe(42);
});
