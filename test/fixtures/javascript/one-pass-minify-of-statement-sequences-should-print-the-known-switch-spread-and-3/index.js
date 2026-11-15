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
	expect(shadowed(0)).toBe(true);
	expect(shadowed(1)).toBe(false);
});
