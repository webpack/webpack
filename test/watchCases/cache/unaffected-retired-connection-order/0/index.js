import "./a.js";
import "./b.js";

const effects = STATE.effects || [];
STATE.effects = [];

it("should distinguish current activity from retired connections", () => {
	expect(effects).toEqual(WATCH_STEP === "0" ? ["a"] : ["b"]);
	for (const stats of STATS_JSON.children) {
		const origin = stats.modules.find((module) => module.name === "./index.js");
		expect(origin.built).toBe(WATCH_STEP === "0");
		expect(origin.codeGenerated).toBe(true);
	}
});
