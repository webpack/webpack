it("should not define the external", () => {
	expect(require("external")).toBe("internal");
});
