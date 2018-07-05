it("should correctly pass complex query object with remaining request", function() {
	expect(require("./a")).toBe("ok");
	expect(require("./b")).toBe("maybe");
	expect(require("./c")).toBe("yes");
	expect(require("./d")).toBe("ok");
});
