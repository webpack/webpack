it("should compile with umd library type and lazyCompilation without errors", () => {
	expect(typeof __webpack_require__).toBe("function");
});