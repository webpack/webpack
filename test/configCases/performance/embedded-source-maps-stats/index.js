import value from "./dep";

it("should report through the stats channel", () => {
	expect(value).toBe("value");
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/embedded source maps/);
	expect(__STATS__.warnings).toHaveLength(0);
});
