import { bbb, aa, bb } from './json.js'

it("should reexport json data correctly", () => {
	expect(aa).toEqual({ a: "A" });
	expect(bb).toEqual({ b: "B" });
	expect(bbb.b).toBe("B");
});
