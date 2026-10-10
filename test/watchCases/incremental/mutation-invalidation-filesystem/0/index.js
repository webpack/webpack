it("should detect ignored invalidation and recover", () => {
	expect(require("./value")).toBe(WATCH_STEP === "0" ? 1 : 2);
	expect(MUTATION.failures()).toBe(WATCH_STEP === "0" ? 0 : 1);
});
