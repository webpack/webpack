it("should report through the stats channel", async () => {
	const a = await import("./a");

	expect(a.load).toBeInstanceOf(Function);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/async chunk waterfall/);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
