it("should throw the build error where the page is imported", () => {
	// A page reached from JavaScript keeps its JavaScript side, so the failed
	// build surfaces as a throw at the import site rather than as markup.
	expect(() => require("./src/page.html")).toThrow(
		/intentional loader <error> -- test/
	);
});
