it("should detect a changed dependency set even when assets stay identical", () => {
	expect(require("./step")).toBe(Number(WATCH_STEP));
	expect(DETECTED.size).toBe(Number(WATCH_STEP));
});
