globalThis.__secondEntryValue = await new Promise((resolve) => {
	setTimeout(() => resolve("second"), 0);
});

it("should await an async entry that is not the last one", () => {
	expect(globalThis.__firstEntryValue).toBe("first");
});

it("should await every async entry, not only one", () => {
	expect(globalThis.__secondEntryValue).toBe("second");
});
