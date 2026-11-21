it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});
