it("should report through the stats channel", () => {
	expect(eval("1")).toBe(1);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/eval usage: 1 module calls/);
	expect(__STATS__.warnings).toHaveLength(0);
});
