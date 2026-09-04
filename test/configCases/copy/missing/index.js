it("should warn instead of failing when a pattern copies nothing", () => {
	expect(__STATS__.errors).toHaveLength(0);
	expect(__STATS__.warnings).toHaveLength(3);
});
