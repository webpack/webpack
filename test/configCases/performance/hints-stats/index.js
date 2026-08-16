it("should report the hint in stats only", () => {
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/module\.rules\[1\]/);
	expect(__STATS__.hintsCount).toBe(1);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
