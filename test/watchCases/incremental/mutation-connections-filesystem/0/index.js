it("should detect stale connections and recover", () => {
	expect(require("./branch")).toBe(WATCH_STEP === "0" ? 1 : 2);
	expect(MUTATION.failures()).toBe(WATCH_STEP === "0" ? 0 : 1);
});
