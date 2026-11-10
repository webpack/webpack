const paths = require("./imports");

it("should track the current requests of a cached external", () => {
	for (const path of paths) expect(typeof path.join).toBe("function");
	expect(paths).toHaveLength(WATCH_STEP === "3" ? 0 : WATCH_STEP === "1" ? 1 : 2);
	if (WATCH_STEP === "1") {
		expect(STATS_JSON.warnings).toHaveLength(1);
		expect(STATS_JSON.warnings[0].message).toMatch(/never imported: first\./);
	} else if (WATCH_STEP === "3") {
		expect(STATS_JSON.warnings).toHaveLength(1);
		expect(STATS_JSON.warnings[0].message).toMatch(/never imported: first, second\./);
	} else {
		expect(paths[1]).toBe(paths[0]);
		expect(STATS_JSON.warnings).toHaveLength(0);
	}
});
