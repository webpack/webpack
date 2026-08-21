import value from "./value";

it("should report only this build's time, step 1", () => {
	expect(value).toBe(1);

	const hint = STATS_JSON.hints.find((entry) => /hotspots:/.test(entry.message));

	expect(hint).toBeDefined();

	const ms = Number(/BurnPlugin \((\d+) ms/.exec(hint.message)[1]);

	// The plugin burns the same amount every build. Anything near a multiple of
	// it means the last build's time was carried into this one.
	expect(ms).toBeGreaterThanOrEqual(100);
	expect(ms).toBeLessThan(240);
});
