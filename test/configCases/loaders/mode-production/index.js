it("provides mode to loaders when the option is 'production'", function() {
	expect(require("./a")).toBe("production");
});
