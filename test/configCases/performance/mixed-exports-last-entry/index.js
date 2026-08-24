export default 1;
export const named = 2;

it("should report when the last entry module is the one that mixes", () => {
	expect(named).toBe(2);
	expect(__STATS__.warnings).toHaveLength(1);
});
