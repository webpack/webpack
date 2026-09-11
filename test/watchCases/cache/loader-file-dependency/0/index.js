import value from "./loader!";

// The module source never changes; only the file the loader declared through
// addDependency does, so the pack must not answer with the old result.
it("should rebuild a loader result when its tracked file changed", () => {
	expect(value).toBe(`tracked-${WATCH_STEP}`);
});
