it("should report through the stats channel", () => {
	expect(__STATS__.hints).toHaveLength(1);
	// A slow runner can stall another tap past the threshold, so the count and
	// the other entries are not pinned, only BurnPlugin's own.
	expect(__STATS__.hints[0].message).toMatch(
		/hotspots: \d+ things? holds? the main thread/
	);
	expect(__STATS__.hints[0].message).toMatch(
		/\n {2}plugin BurnPlugin \(\d+ ms over \d+ runs?\)/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
