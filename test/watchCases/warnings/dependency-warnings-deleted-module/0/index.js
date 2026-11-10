it("should report a warning that a deleted module causes in a clean importer", () => {
	if (WATCH_STEP === "1") {
		expect(() => require("./importer")).toThrow(/Cannot find module/);
		return;
	}
	expect(require("./importer").value).toBe(1);
});
