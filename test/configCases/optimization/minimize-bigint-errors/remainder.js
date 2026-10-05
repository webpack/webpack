it("should keep a BigInt remainder by zero as a runtime error", () => {
	expect(() => 1n % 0n).toThrow(RangeError);
	expect(() => 1n % (2n - 2n)).toThrow(RangeError);
	expect(() => +1n % 0n).toThrow(TypeError);
	expect(() => 1 % 0n).toThrow(TypeError);
	expect(() => 1n % 0).toThrow(TypeError);
	expect(() => {
		1n % 0n;
	}).toThrow(RangeError);
});

it("should keep an unused initializer with a BigInt remainder by zero", () => {
	expect(() => {
		const unused = (() => 1n % 0n)();
	}).toThrow(RangeError);
});

it("should still evaluate valid remainders", () => {
	expect(5n % 2n).toBe(BigInt(1));
	expect(-5n % 2n).toBe(BigInt(-1));
	expect(5 % 2).toBe(1);
	expect(1 % 0).toBeNaN();
});
