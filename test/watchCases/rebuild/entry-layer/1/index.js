const value = 2;

it("should keep the entry layer across rebuilds", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
	const layers = STATS_JSON.modules.map((m) => m.layer);
	expect(layers).toContain("app");
});
