it("should report the import of a module restored after its export was removed", () => {
	if (WATCH_STEP === "1" || WATCH_STEP === "2") {
		expect(() => require("./entry")).toThrow(/Cannot find module/);
		return;
	}
	expect(require("./entry").y).toBe(1);
});
