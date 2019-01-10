it("should have hmr flag in loader context", function() {
	expect(require("./loader!")).toBe(!!module.hot);
});
