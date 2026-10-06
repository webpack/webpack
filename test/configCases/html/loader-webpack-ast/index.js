it("should fail the build of a page a loader hands a preparsed AST", () => {
	expect(() => require("./src/page.html")).toThrow(
		/webpackAst is unexpected for the HtmlParser/
	);
});
