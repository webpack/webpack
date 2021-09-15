it("should load circular dependencies correctly", function() {
	expect(require("./circular")).toBe(1);
});
