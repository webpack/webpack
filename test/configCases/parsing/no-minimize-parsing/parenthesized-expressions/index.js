const value = ((require("./value")));

it("parenthesized-expressions: should preserve nested expressions and their dependencies", () => {
	expect((((value)))).toBe(42);
	expect(1 + ((value))).toBe(43);
	expect(((value), (value + 1))).toBe(43);
});

it("parenthesized-expressions: should keep arrow parameters separate from nested expressions", () => {
	const identity = (input) => ((input));
	const combine = (first) => (second) => ((first) + (second));
	const defaults = (input = (value),) => (input);
	const destructured = ({ input = (value) }) => (input);
	const rest = (...inputs) => (inputs);
	expect((identity)((value))).toBe(42);
	expect(combine(20)(22)).toBe(42);
	expect(defaults()).toBe(42);
	expect(destructured({})).toBe(42);
	expect(rest(1, 2)).toEqual([1, 2]);
});
