it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(Number(WATCH_STEP));
});
