it("should run under trusted types with hot updates enabled", () => {
	expect(typeof module.hot).toBe("object");
});
