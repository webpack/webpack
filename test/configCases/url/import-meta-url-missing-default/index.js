it("should still fail the build for a missing asset by default", () => {
	expect(() => new URL("./missing.png", import.meta.url)).toThrow();
});
