import * as ns from "./cjs.js";
import { loaded } from "./unused.js";

it("should keep a replaced import apart from a preceding division sign", () => {
	var value = 4 /ns.__esModule * 3;
	expect(value).toBe(12);
	expect(() => 4 /ns * 3).toThrow(TypeError);
});

it("should keep unused asset replacements apart from adjacent tokens", () => {
	expect(loaded).toBe(true);
});
