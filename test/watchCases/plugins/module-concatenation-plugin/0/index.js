it("should watch for changes", function () {
	if (WATCH_STEP === "0") {
		expect(require("./foo/" + WATCH_STEP)).toBe(
			"This is only a test." + WATCH_STEP
		);
	} else if (WATCH_STEP === "1") {
		expect(require("./foo/" + WATCH_STEP)).toBe(
			"This should be a test." + WATCH_STEP
		);
	} else if (WATCH_STEP === "2") {
		expect(require("./foo/" + WATCH_STEP)).toBe(
			"This should be working." + WATCH_STEP
		);
	}

	const realModule = m => m.moduleType !== "runtime" && !m.orphan;
	expect(STATS_JSON.modules.filter(realModule).length).toBe(
		4 + Number(WATCH_STEP)
	);
});
