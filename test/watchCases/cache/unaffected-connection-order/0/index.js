import "./a.js";
import "./b.js";

const effects = STATE.effects || [];
STATE.effects = [];

it("should associate connection activity with the correct dependency", () => {
	expect(effects).toEqual([
		["a"], ["b"], ["b"], ["a"], ["a", "b"], ["a", "b"], [], [], ["b"]
	][WATCH_STEP]);
});

it("should reuse unchanged modules when connections move", () => {
	for (const stats of STATS_JSON.children) {
		const origin = stats.modules.find((module) => module.name === "./index.js");
		expect(origin.built).toBe(WATCH_STEP === "0");
		if (["2", "5", "7"].includes(WATCH_STEP)) {
			expect(origin.codeGenerated).toBe(false);
		}
	}
});
