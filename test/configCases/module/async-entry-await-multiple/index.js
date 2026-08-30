it("should await an async entry that is not the last one", () => {
	expect(globalThis.__firstEntryValue).toBe("first");
});
