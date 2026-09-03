import { mul } from "./pure-esm";
import { div } from "./impure-esm";

it("should compute", () => {
	expect(mul(6, 7)).toBe(42);
	expect(div(84, 2)).toBe(42);
});
