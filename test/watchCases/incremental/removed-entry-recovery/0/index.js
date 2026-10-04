it("should report a removed entry and recover when it returns", () => {
	expect(STATS_JSON.errors).toHaveLength(WATCH_STEP === "1" ? 1 : 0);
	expect(
		STATS_JSON.modules.some((module) => module.name === "./changing.js")
	).toBe(WATCH_STEP !== "1");
});
