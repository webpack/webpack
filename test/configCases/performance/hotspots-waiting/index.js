it("should not blame a plugin for time it spent waiting", () => {
	expect(__STATS__.warnings).toHaveLength(0);
});
