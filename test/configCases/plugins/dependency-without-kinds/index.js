import { value } from "./barrel";
import { asyncValue } from "./middle";
import { pure } from "./pure";

it("should build when a dependency has no is()", () => {
	expect(value).toBe(1);
	expect(asyncValue).toBe(2);
	expect(pure()).toBe(3);
});
