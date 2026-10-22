it("parsing: should parse nested requires successfully", () => {
	expect(require("./nested-require").value).toBe(42);
});
