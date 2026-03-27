import { type MyType } from "./only-types.ts";

const x: MyType = 42;

it("should work", () => {
	expect(x).toBe(42);
	expect(Object.keys(__webpack_modules__).length).toBe(1);
});
