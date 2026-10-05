const value = 2;

it("should rebuild an entry registered with its own context", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
});
