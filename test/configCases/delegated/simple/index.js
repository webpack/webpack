it("should delegate the modules", function() {
	expect(require("./a")).toBe("a");
	expect(require("./loader!./b")).toBe("b");
	expect(require("./dir/c")).toBe("c");
});
