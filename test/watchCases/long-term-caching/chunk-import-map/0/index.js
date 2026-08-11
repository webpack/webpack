it("should emit the import map on every rebuild", () => {
	// The map is derived from the chunk graph, not recorded while rendering, so
	// a rebuild that reuses cached chunk assets still emits a complete map.
	const map = STATS_JSON.assets.find((a) => a.name === "importmap.json");
	expect(map).toBeDefined();
	expect(map.emitted).toBe(true);
	const vendor = STATS_JSON.assetsByChunkName.vendor[0];
	if (WATCH_STEP === "0") {
		STATE.vendor = vendor;
	} else {
		// The edit landed, and the map was rebuilt for it.
		expect(vendor).not.toBe(STATE.vendor);
	}
});
