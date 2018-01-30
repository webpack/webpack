it("should delegate the modules", function() {
	expect(require("./a")).toBe("a");
	expect(require("./loader!./b")).toBe("b");
	expect(require("./dir/c")).toBe("c");
	expect(require("./d")).toBe("d");
	expect(require("./e")).toBe("e");
});
