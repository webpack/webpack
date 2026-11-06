import object from "./object.cjs";

it("should keep CommonJS exports read through this in an imported method", () => {
	expect(object.read()).toBe(42);
});
