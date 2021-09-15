it("provides mode to loaders when the option is 'development'", function() {
	expect(require("./a")).toBe("development");
});
