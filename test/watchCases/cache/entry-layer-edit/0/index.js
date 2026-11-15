it("should preserve the entry layer", () => {
	expect(__webpack_layer__).toBe("fixed");
	expect(require("./child")).toBe("fixed");
});
