it("should resolve through the configured file systems", () => {
	expect(require("./dep")).toBe("dep");
});
