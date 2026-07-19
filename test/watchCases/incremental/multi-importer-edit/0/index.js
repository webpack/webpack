it("propagates a shared module edit to unchanged importers", () => {
	// a and b are never edited; only shared changes each step
	expect(require("./a").va).toBe(WATCH_STEP);
	expect(require("./b").vb).toBe(WATCH_STEP);
});
