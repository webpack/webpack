it("should resolve the alias in package.json", function() {
	require("app/file").default.should.be.eql("file");
});

it("should resolve the alias and extensions in package.json", function() {
	require("app/file2").default.should.be.eql("correct file2");
});

it("should resolve the alias in package.json", function() {
	require("thing").default.should.be.eql("the thing");
});

