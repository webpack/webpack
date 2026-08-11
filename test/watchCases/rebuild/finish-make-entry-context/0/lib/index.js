const value = 1;

it("should rebuild an entry registered from finishMake with its own context", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
});
