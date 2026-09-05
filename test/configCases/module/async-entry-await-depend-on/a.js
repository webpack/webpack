import { base } from "./shared.js";

const value = await new Promise((resolve) => {
	setTimeout(() => resolve(base + 1), 0);
});

it("should settle the bundle only after the first async entry finished", () => {
	expect(value).toBe(42);
});
