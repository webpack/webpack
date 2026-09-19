import { mul } from "./pure-cjs";

export function times(a, b) {
	return mul(a, b);
}

it("should still run after minification", () => {
	expect(times(6, 7)).toBe(42);
});
