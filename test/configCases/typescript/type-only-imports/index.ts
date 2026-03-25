import type { SomeInterface } from "./types.ts";
import { realValue } from "./constants.ts";
import { type OtherSomeInterface, otherRealValue } from "./mixed.ts";

const x: SomeInterface = { value: realValue };
const y: OtherSomeInterface = { value:  otherRealValue };

it("should work", () => {
	expect(x.value).toBe(42);
	expect(y.value).toBe(42);
});
