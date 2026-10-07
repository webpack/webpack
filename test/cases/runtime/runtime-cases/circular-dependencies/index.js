it("circular-dependencies: should load circular dependencies correctly", function() {
	expect(require("./circular")).toBe(1);
});
