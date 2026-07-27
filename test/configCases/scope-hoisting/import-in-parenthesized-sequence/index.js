import { run } from "./module";

it("should emit valid JS for an imported call after a parenthesized sequence element", () => {
	expect(run({ a: 1, b: 2 })).toBe(3);
});
