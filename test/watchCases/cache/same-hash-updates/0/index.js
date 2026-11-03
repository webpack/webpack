it("should check warnings and watch new dependencies without changing the hash", () => {
	if (WATCH_STEP === "0") STATE.hash = STATS_JSON.hash;
	expect(STATS_JSON.hash).toBe(STATE.hash);
	expect(STATS_JSON.warnings.map((warning) => warning.message)).toEqual(
		[[], ["Watched value: second"], ["Watched value: changed"], [], []][Number(WATCH_STEP)]
	);
	expect(STATS_JSON.modules.find((module) => module.name === "./index.js").built).toBe(true);
});
