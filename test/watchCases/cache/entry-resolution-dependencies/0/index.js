it("should retain resolution probes for an unchanged entry", () => {
	const entry = STATS_JSON.modules.find((module) => module.name === "./index.js");
	expect(entry.built).toBe(WATCH_STEP !== "1");
	expect(entry.moduleType).toBe(
		WATCH_STEP === "2" ? "javascript/esm" : "javascript/auto"
	);
});
