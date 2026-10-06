const value = require("./a-value");

it("should rebuild a compiler after the ones it depends on, one at a time", () => {
	expect(value).toBe(WATCH_STEP === "2" || WATCH_STEP === "3" ? "a2" : "a0");
	// Step 1 changes b, step 2 a's own file, step 3 both b and c.
	const rebuilt = [["a", "b", "c"], ["a", "b"], ["a"], ["a", "b", "c"]][
		Number(WATCH_STEP)
	];
	expect(STATS_JSON.children.map((child) => child.name).sort()).toEqual(
		rebuilt
	);
	// parallelism: 1 — every run ends before the next one starts
	for (let i = 0; i < EVENTS.length; i += 2) {
		const name = EVENTS[i].split(" ")[0];
		expect(EVENTS.slice(i, i + 2)).toEqual([`${name} run`, `${name} done`]);
	}
	// `a` runs last, once, after every dependency that rebuilt
	expect(EVENTS.filter((event) => event === "a run")).toHaveLength(1);
	expect(EVENTS.slice(-2)).toEqual(["a run", "a done"]);
	for (const dependency of rebuilt.filter((name) => name !== "a")) {
		expect(EVENTS).toContain(`${dependency} done`);
	}
	EVENTS.length = 0;
});
