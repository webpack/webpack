export default 1;
export const named = 2;

it("should report through the stats channel", () => {
	expect(named).toBe(2);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/mixed exports: 1 entry/);
	expect(__STATS__.warnings).toHaveLength(0);
});
