it("should drop a removed dynamic entry", () => {
	const names = Object.keys(STATS_JSON.entrypoints);
	if (WATCH_STEP === "0") {
		expect(names).toContain("extra");
	} else {
		expect(names).not.toContain("extra");
	}
});
