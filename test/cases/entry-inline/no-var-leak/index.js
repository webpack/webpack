var localVar = 42;

it("should not leak localVar to other modules", () => {
	expect(localVar).toBe(42);
	expect(require("./module")).toBe("undefined");
});
