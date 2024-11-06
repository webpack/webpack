it("should watch for changes", function() {
	expect(require("./changing-file")).toBe(WATCH_STEP);
})
