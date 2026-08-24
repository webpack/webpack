import value, { scoped } from "./dep";

it("should leave a name with more than one binding alone", () => {
	expect(value).toBe(1);
	expect(scoped(0)).toBe(2);
	expect(__STATS__.warnings).toHaveLength(0);
});
