it("should not use regexps with the g flag", function() {
	expect(require.context("./folder", true, /a/).keys().length).toBe(1);
	expect(require.context("./folder", true, /a/g).keys().length).toBe(0);
});
