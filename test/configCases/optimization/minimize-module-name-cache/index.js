it("should preserve globals with names cached from another module", () => {
	expect(typeof process.platform).toBe("string");
});
