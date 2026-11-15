const effects = STATE.effects || [];
STATE.effects = [];

it("should execute the current imports after connections change", () => {
	expect(effects).toEqual(
		[[], ["a"], ["a", "b"], ["a", "b"], ["a"], [], []][WATCH_STEP]
	);
});

it("should keep unchanged modules cached without rebuilding the source", () => {
	for (const stats of STATS_JSON.children) {
		const origin = stats.modules.find((module) => module.name === "./index.js");
		const imports = stats.modules.find(
			(module) => module.name === "./imports.js"
		);
		expect(origin.built).toBe(WATCH_STEP === "0");
		expect(imports.built).toBe(WATCH_STEP === "0");
		expect(imports.codeGenerated).toBe(WATCH_STEP === "0");
		if (WATCH_STEP === "3" || WATCH_STEP === "6") {
			expect(origin.codeGenerated).toBe(false);
		}
	}
});
