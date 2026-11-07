it("should report and recover from a missing retained dependency", () => {
	const run = () => require("./consumer").run();
	if (WATCH_STEP === "3") {
		expect(run).toThrow(/Cannot find module/);
	} else {
		expect(run()).toBe(44);
	}
});
