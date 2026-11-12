import value from "./value";

it("should preserve errors from the rebuilt entry hook", () => {
	expect(value).toBe(WATCH_STEP);
});
