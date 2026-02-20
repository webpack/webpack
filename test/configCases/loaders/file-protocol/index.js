it("should work with file protocol in loader", function() {
	expect(require("./a")).toBe("production");
});

it("should work with file protocol in use", function() {
	expect(require("./b")).toBe("production");
});
