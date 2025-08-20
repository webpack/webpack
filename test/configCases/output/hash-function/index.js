import mod from "./module.js";

it("should work", () => {
	expect(mod(1, 2)).toBe(3);
	expect(__STATS__.hash).toHaveLength(25);
});
