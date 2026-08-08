const value = 1;

it("should rebuild an entry that lives below the context", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
});
