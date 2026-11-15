it("should preserve the entry layer when resolving changed dependencies", () => {
	expect(__webpack_layer__).toBe("fixed");
	expect(require("./child")).toBe("fixed");
	expect(require("./added")).toBe("fixed");
});
