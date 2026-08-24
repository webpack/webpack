import values from "./dep";

it("should report reads of 'this' at the top level of an ES module", () => {
	expect(values[0]).toBeUndefined();
	expect(values[1]).toBeUndefined();
});
