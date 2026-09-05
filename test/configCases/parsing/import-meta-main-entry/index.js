it("should keep import.meta.main a runtime check for the entry module", () => {
	expect(import.meta.main).toBe(true);
});
