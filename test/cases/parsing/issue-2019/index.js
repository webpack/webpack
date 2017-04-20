it("should not fail on default export before export", function() {
	expect(require("./file").default).toEqual("default");
	expect(require("./file").CONSTANT).toEqual("const");
});