const value = require("./added");

it("should coalesce edits during compilation and continue rebuilding", () => {
	const step = Number(WATCH_STEP);
	expect(value).toBe([0, 2, 30, 40][step]);
	expect(WATCH_EVENTS.callbacks).toBe([0, 1, 3, 3][step]);
	expect(WATCH_EVENTS.completed).toBeGreaterThanOrEqual(step + 1);
	expect(WATCH_EVENTS.builds).toBeGreaterThanOrEqual([1, 3, 5, 6][step]);
});
