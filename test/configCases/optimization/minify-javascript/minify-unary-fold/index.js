var LABEL = "label";

function pass(value, other) {
	return [value, other];
}

function shadowed(NaN) {
	return !NaN;
}

it("should print the value a unary operator on a known value makes", () => {
	expect(pass(!LABEL, -"2")).toEqual([false, -2]);
	expect(pass(~1, !(1 + 1))).toEqual([-2, false]);
	expect(pass(!NaN, !Infinity)).toEqual([true, false]);
	// Read off an array, the arguments keep `shadowed` from folding at its calls.
	const values = [0, 1];
	expect(shadowed(values[0])).toBe(true);
	expect(shadowed(values[1])).toBe(false);
});
