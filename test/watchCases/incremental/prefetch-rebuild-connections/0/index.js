it("should detach connections replaced during prefetch", () => {
	expect(require("uncached!./branch")).toBe(WATCH_STEP === "1" ? 2 : 1);
});
