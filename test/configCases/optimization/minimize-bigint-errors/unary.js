it("should keep unary plus on a BigInt as a runtime error", () => {
	expect(() => +1n).toThrow(TypeError);
	expect(() => +(1n + 2n)).toThrow(TypeError);
	expect(() => +(1n % 0n)).toThrow(RangeError);
	expect(() => {
		+1n;
	}).toThrow(TypeError);
});

it("should keep an unused initializer that applies unary plus to a BigInt", () => {
	expect(() => {
		const unused = (() => +1n)();
	}).toThrow(TypeError);
});

it("should still evaluate valid unary operations", () => {
	expect(+"42").toBe(42);
	expect(+42).toBe(42);
	expect(-1n).toBe(BigInt(-1));
	expect(~1n).toBe(BigInt(-2));
});
