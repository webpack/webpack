it("should not have access to require, module and define", () => {
	expect(require.webpackTestSuiteRequire).toBe(true);
	expect(module.webpackTestSuiteModule).toBe(true);
	expect(typeof define).toBe("undefined");
});
