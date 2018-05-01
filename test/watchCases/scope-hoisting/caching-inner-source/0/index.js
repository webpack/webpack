it("should not crash when scope-hoisted modules change", function() {
	expect(require("./module").default).toBe(WATCH_STEP);
});
