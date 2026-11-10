STATE.effect = false;
require("./wrapper");
const effect = STATE.effect;

it("should update the connection in runtime a", () => {
	expect(effect).toBe(WATCH_STEP === "0" || WATCH_STEP === "3");
	expect(require("./stable")).toBe(42);
});

it("should reuse code generation only for unaffected modules", () => {
	for (const stats of STATS_JSON.children) {
		const stable = stats.modules.find((module) => module.name === "./stable.js");
		const wrapper = stats.modules.find((module) => module.name === "./wrapper.js");
		expect(stable.codeGenerated).toBe(WATCH_STEP === "0");
		expect(wrapper.codeGenerated).toBe(WATCH_STEP !== "2");
	}
});
