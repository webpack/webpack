it("should stay quiet without polyfill packages", () => {
	expect(__STATS__.warnings).toHaveLength(0);
});
