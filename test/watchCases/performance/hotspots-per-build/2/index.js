import value from "./value";

it("should report only this build's time, step 2", () => {
	expect(value).toBe(2);

	const hint = STATS_JSON.hints.find((entry) => /hotspots:/.test(entry.message));

	expect(hint).toBeDefined();

	const ms = Number(/BurnPlugin \((\d+) ms/.exec(hint.message)[1]);
	const { burned } = COMPILER.options.plugins.find(
		(plugin) => "burned" in plugin
	);

	// Measured against this build's own burn, so a slow machine cancels out; a
	// carried-over build would add a whole earlier burn (130 ms or more).
	expect(ms).toBeGreaterThanOrEqual(Math.floor(burned));
	expect(ms - burned).toBeLessThan(100);
});
