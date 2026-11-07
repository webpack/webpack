import value from "./value";

it("should recover from entry hook diagnostics", () => {
	expect(value).toBe(WATCH_STEP);
});
