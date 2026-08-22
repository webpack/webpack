it("should report through the stats channel", () => {
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(
		/hotspots: 1 thing holds the main thread/
	);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
