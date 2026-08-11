it("should report a deleted module as an error instead of aborting the watch", () => {
	if (WATCH_STEP === "0") {
		expect(require("./foo").value).toBe("foo");
	} else {
		expect(() => require("./foo")).toThrow();
	}
});
