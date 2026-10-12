it("should preserve the watched plugin state across fresh compilations", () => {
	expect(require("./value")).toBe(Number(WATCH_STEP));
});
