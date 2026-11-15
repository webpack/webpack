const effects = STATE.effects || [];
STATE.effects = [];

it("should execute the current imports after a target is replaced", () => {
	expect(effects).toEqual([
		["a", "b"],
		["a", "c"],
		["a", "c"],
		["a", "b"],
		["a", "b"],
		["a"],
		["a"],
		[],
		[]
	][WATCH_STEP]);
});

it("should reuse code when the targets stay unchanged", () => {
	for (const stats of STATS_JSON.children) {
		const origin = stats.modules.find((module) => module.name === "./index.js");
		const imports = stats.modules.find(
			(module) => module.name === "./imports.js"
		);
		expect(origin.built).toBe(WATCH_STEP === "0");
		expect(imports.built).toBe(WATCH_STEP === "0");
		expect(imports.codeGenerated).toBe(WATCH_STEP === "0");
		if (WATCH_STEP !== "0" && Number(WATCH_STEP) % 2 === 0) {
			expect(origin.codeGenerated).toBe(false);
		}
	}
});
