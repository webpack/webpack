/** @returns {Promise<{ default: string }>} module a namespace */
const loadA = () => import(/* webpackChunkName: "a" */ "./a.js");
/** @returns {Promise<{ default: string }>} module b namespace */
const loadB = () => import(/* webpackChunkName: "b" */ "./b.js");

it("should load imports after chunks move between async blocks", async () => {
	expect((await loadB()).default).toBe("b");
	expect((await loadA()).default).toBe("a");
});

it("should reuse generated code only when block boundaries stay unchanged", () => {
	for (const stats of STATS_JSON.children) {
		const origin = stats.modules.find((module) => module.name === "./index.js");
		expect(origin.built).toBe(WATCH_STEP === "0");
		expect(origin.codeGenerated).toBe(
			WATCH_STEP === "0" || WATCH_STEP === "1" || WATCH_STEP === "3"
		);
	}
});
