it("should detect missing error recovery and retry", () => {
	if (WATCH_STEP === "0") expect(STATS_JSON.errors).toHaveLength(1);
	else expect(require("./missing")).toBe(42);
	expect(MUTATION.failures()).toBe(WATCH_STEP === "0" ? 0 : 1);
});
