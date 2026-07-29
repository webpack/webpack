it("should load an async WebAssembly module referenced by an analyzable new URL", async () => {
	const { run } = await import("./module");
	expect(run()).toBe(84);
});

it("should emit the analyzable fetch(new URL(..., import.meta.url)) form without a runtime publicPath global", () => {
	// `fs`/`path` come from `moduleScope` (web target has no node built-ins).
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Built at runtime so the assertion doesn't self-match this file's source.
	const publicPath = `${"__webpack_require__"}.p`;

	expect(bundle).toMatch(/fetch\(new URL\([^;]*import\.meta\.url\)\)/);
	// The wasm URL is relative to `import.meta.url`, so no runtime publicPath global.
	expect(bundle).not.toContain(publicPath);
});
