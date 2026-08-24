export default 1;
export const one = 1;

it("should report every entry that mixes them", () => {
	expect(one).toBe(1);
	expect(__STATS__.warnings).toHaveLength(1);
});
