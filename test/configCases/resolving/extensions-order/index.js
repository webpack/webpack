it("should resolve respecting resolve.extensions order when enforceExtension: true", () => {
	expect(require("./a")).toBe("2");
	expect(require("./b")).toBe("1");
});
