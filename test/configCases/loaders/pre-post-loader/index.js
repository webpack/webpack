it("should apply pre and post loaders correctly", function() {
	expect(require("./a")).toBe("resource loader2 loader1 loader3");
	expect(require("!./a")).toBe("resource loader2 loader3");
	expect(require("!!./a")).toBe("resource");
	expect(require("-!./a")).toBe("resource loader3");
});
