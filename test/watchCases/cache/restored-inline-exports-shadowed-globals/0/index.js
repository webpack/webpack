import read from "./consumer";

it("should preserve literal values in a restored shadowing consumer", () => {
	const values = read(42, 43);
	if (WATCH_STEP === "1") {
		expect(values).toEqual([7, "ok"]);
	} else {
		expect(values[0]).toBeUndefined();
		expect(values[1]).toBeNaN();
	}
	const consumer = STATS_JSON.modules.find((module) => module.name === "./consumer.js");
	expect(consumer.cached).toBe(WATCH_STEP !== "0");
});
