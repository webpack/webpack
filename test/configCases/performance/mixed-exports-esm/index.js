export default 1;
export const named = 2;

it("should stay quiet for a library that is not CommonJS", () => {
	expect(named).toBe(2);
	expect(__STATS__.warnings).toHaveLength(0);
});
