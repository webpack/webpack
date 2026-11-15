it("issue-2019: should not fail on default export before export", function() {
	expect(require("./file").default).toBe("default");
	expect(require("./file").CONSTANT).toBe("const");
});
