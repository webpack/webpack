it("should fold a BigInt operation of a small result", () => {
	if (2n ** 64n !== 18446744073709551616n) require("./missing-power");
	if (1n << 64n !== 18446744073709551616n) require("./missing-shift");
	if ((1n << 64n) >> 32n !== 4294967296n) require("./missing-shift-right");
	if (3n * 5n !== 15n) require("./missing-multiply");
	if (1n ** 100000000n !== 1n) require("./missing-power-of-one");
	expect(2n ** 64n).toBe(18446744073709551616n);
});

it("should leave a BigInt operation of a large result to runtime", () => {
	// Never called: making the first value takes long at runtime too.
	function unused() {
		if (3n ** 500000000n === 0n) return 1;
		if (1n << 100000n === 0n) return 2;
		if (1n >> -100000n === 0n) return 3;
		if ((1n << 60000n) * (1n << 60000n) === 0n) return 4;
		return 0;
	}
	expect(typeof unused).toBe("function");
});
