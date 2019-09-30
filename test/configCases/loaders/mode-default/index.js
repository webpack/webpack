it("provides mode to loaders when the option is omitted", function() {
	expect(require("./a")).toBe("production");
});
