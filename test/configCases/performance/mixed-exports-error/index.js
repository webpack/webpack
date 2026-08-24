export default 1;
export const named = 2;

it("should report through the error channel", () => {
	expect(named).toBe(2);
});
