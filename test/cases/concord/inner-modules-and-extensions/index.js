it("should resolve the alias in package.json", function() {
	expect(require("app/file").default).toBe("file");
});

it("should resolve the alias and extensions in package.json", function() {
	expect(require("app/file2").default).toBe("correct file2");
});

it("should resolve the alias in package.json", function() {
	expect(require("thing").default).toBe("the thing");
});

