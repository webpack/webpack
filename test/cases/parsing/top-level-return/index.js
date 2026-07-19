it("should support a top-level return in an auto module (early return)", () => {
	expect(require("./early-return")).toBe("before");
});

it("should support a top-level return on an untaken branch", () => {
	expect(require("./no-return")).toBe("full");
});
