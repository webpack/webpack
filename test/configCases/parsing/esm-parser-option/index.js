import { a, s } from "./a";
import { b } from "./b";

it("should parse ESM under both spellings of the parser option", () => {
	expect(a).toBe(1);
	expect(b).toBe(2);
	expect(s).toBe(5);
});
