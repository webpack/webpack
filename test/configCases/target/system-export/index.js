// This test verifies that values exported by a webpack bundle are consumable by systemjs.

export const namedThing = {
	hello: "there"
};

export default "the default export";

it("should successfully export values to System", function() {
	const exports = eval("System").registry["(anonym)"].exports;
	expect(exports["default"]).toBe("the default export");
	expect(exports.namedThing).toBe(namedThing);
});
