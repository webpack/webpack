import values from "./dep";

it("should report reads of 'this' at the top level of an ES module", () => {
	expect(values[0]).toBeUndefined();
	expect(values[1]).toBeUndefined();
	// The one inside `classic` was excluded because it rebinds, which is
	// only correct if its `this` really is the call receiver.
	const receiver = {};

	expect(values[2].call(receiver)).toBe(receiver);
});
