export default 1;
export const named = 2;

it("should read a library configured on the entry itself", () => {
	expect(named).toBe(2);
	expect(__STATS__.warnings).toHaveLength(1);
});
