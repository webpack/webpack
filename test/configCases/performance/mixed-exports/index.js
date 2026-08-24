export default 1;
export const named = 2;

it("should report a default beside named exports", () => {
	expect(named).toBe(2);
});
