import value from "./value";

it("should preserve warnings from the rebuilt entry hook", () => {
	expect(value).toBe(WATCH_STEP);
});
