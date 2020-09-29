it("should correctly pass complex query object with remaining request (with custom ident)", function() {
	expect(require("./a")).toBe("ok");
});

it("should correctly pass complex query object with remaining request (with default ident)", function() {
	expect(require("./b")).toBe("ok");
});

it("should correctly pass complex query object with remaining request (with shorthand syntax and default ident)", function() {
	expect(require("./c")).toBe("ok");
});
