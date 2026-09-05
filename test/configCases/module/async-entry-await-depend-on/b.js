import { base } from "./shared.js";

const value = await new Promise((resolve) => {
	setTimeout(() => resolve(base + 2), 0);
});

it("should settle the bundle only after the last async entry finished", () => {
	expect(value).toBe(43);
});
