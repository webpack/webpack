import foo from "./module?query=1#hash"

it("should work", () => {
	expect(foo).toBe(42);
});
