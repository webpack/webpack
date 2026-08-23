export default 1;
export const named = 2;

it("should stay quiet when hints are off", () => {
	expect(named).toBe(2);
	expect(__STATS__.hints).toHaveLength(0);
});
