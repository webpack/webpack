// The `Bun` namespace is a runtime-provided global; webpack must leave it as a
// free global (no bundling, shimming or renaming) so the standard API works.
it("should keep Bun's standard API available as a global", () => {
	expect(typeof Bun).toBe("object");
	expect(typeof Bun.version).toBe("string");
	expect(typeof Bun.file).toBe("function");
});
