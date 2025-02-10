it("should work when loader is async", function() {
	expect(require("./a")).toBe("a");
});

it("should work when loader is async #2", function() {
	expect(require("./b")).toBe("b");
});

it("should work when loader is async #3", function() {
	expect(require("./c")).toBe("c");
});

