it("should resolve the alias in package.json", function() {
	expect(require("app/file").default).toEqual("file");
});

it("should resolve the alias and extensions in package.json", function() {
	expect(require("app/file2").default).toEqual("correct file2");
});

it("should resolve the alias in package.json", function() {
	expect(require("thing").default).toEqual("the thing");
});

