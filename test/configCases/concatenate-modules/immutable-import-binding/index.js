import { B } from "./m.js";

it("should reject a write to an imported binding even when concatenated", () => {
	expect(() => {
		B = null;
	}).toThrow(TypeError);
	expect(B).toBe(1);
});
