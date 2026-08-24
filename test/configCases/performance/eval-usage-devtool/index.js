it("should not count webpack's own eval wrapper", () => {
	expect(__STATS__.warnings).toHaveLength(0);
});
