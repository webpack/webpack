it("should not have access to require, module and define", () => {
	expect(
		typeof require === "undefined" || require.webpackTestSuiteRequire
	).toBe(true);
	expect(typeof module === "undefined" || module.webpackTestSuiteModule).toBe(
		true
	);
	expect(typeof define).toBe("undefined");
});
