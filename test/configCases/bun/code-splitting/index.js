// Validates native `import()` chunk loading for the ESM output of the bun target.
it("should load an async chunk via native import()", async () => {
	const { value } = await import("./chunk");
	expect(value).toBe(42);
});
