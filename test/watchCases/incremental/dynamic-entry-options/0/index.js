it("should honor changed entry options on rebuilds", () => {
	const assets = STATS_JSON.assets.map((a) => a.name);
	if (WATCH_STEP === "0") {
		expect(assets).toContain("first-other.js");
	} else {
		expect(assets).toContain("second-other.js");
	}
});
