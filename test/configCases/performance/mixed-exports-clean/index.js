export const one = 1;
export const two = 2;

it("should stay quiet without a default export", () => {
	expect(one + two).toBe(3);
	expect(__STATS__.warnings).toHaveLength(0);
});
