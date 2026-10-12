it("should retry a failed entry once the file appears", () => {
	const assets = STATS_JSON.assets.map((a) => a.name);
	if (WATCH_STEP !== "0") {
		expect(assets).toContain("broken.js");
	}
});
