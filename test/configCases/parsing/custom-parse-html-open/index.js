export const value = 1;

it("should keep `<!--` operators of a module read by a custom parse", () => {
	let x = 3;
	let y = 2;
	const result = x<!--y;
	expect(result).toBe(false);
	expect(y).toBe(1);
});
