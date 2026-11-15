it("should recreate config factories without sharing their closure state", () => {
	expect(require("./value")).toBe(Number(WATCH_STEP));
});
