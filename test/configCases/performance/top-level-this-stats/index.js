import values from "./dep";

it("should handle the stats channel", () => {
	expect(values[0]).toBeUndefined();
	expect(values[1]).toBeUndefined();
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/top-level this/);
	expect(__STATS__.warnings).toHaveLength(0);
});
