import value from "my-alias";

// The alias lives in the configuration, reused until cache.version changes.
it("should re-resolve an alias when the cache version marks the config changed", () => {
	expect(value).toBe(`from-${["a", "b", "a"][Number(WATCH_STEP)]}`);
});
