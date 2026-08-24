import total from "dep";

it("should handle the stats channel", () => {
	expect(total).toBe(66);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/loaders on dependencies/);
	expect(__STATS__.warnings).toHaveLength(0);
});
