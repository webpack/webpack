it("resolve should work in loader context", function() {
	expect(require("./a")).toBe("b.js");
});
