it("should recover re-exports when the missing target appears", () => {
	if (WATCH_STEP === "0") {
		expect(() => require("./barrel")).toThrow();
		return;
	}
	const value = require("./barrel");
	expect(Object.keys(value)).toEqual(["answer"]);
	expect(value.answer).toBe(42);
	for (const stats of STATS_JSON.children) {
		const barrel = stats.modules.find(module => module.name === "./barrel.js");
		expect(barrel.providedExports).toEqual(["answer"]);
	}
});
