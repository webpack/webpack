export default 1;
export const one = 1;

it("should report each library type on its own", () => {
	expect(one).toBe(1);
	expect(__STATS__.warnings).toHaveLength(2);
});
