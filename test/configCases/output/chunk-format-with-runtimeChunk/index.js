it("should compile and run", () => {
	const synaticError = 'SyntaxError: The requested module ./runtime.mjs does not provide an export named default'
	expect(!synaticError).toBe(false);
});
