it("should resolve module dependencies recursively", function() {
	expect(require("!./loaders/index!a")).toBe("c");
});
