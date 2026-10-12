it("should accept weak plugin connections without dependency parents", () => {
	expect(require("./value")).toBe(WATCH_STEP === "0" ? 42 : 43);
});
