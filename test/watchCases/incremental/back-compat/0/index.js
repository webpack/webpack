it("should keep the deprecated Array API on Compilation.modules", () => {
	expect(require("./changing").value).toBe(WATCH_STEP);
});
