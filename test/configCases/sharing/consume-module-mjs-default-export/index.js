it("should correctly handle default imports in .mjs files from shared modules", async () => {
	await __webpack_init_sharing__("default");

	const { testDefaultImport } = await import("./pure-esm-consumer.mjs");
	const result = testDefaultImport();

	expect(result.defaultType).toBe("function");
	expect(result.defaultValue).toBe("shared default export");
	expect(result.namedExportValue).toBe("shared named export");
});
