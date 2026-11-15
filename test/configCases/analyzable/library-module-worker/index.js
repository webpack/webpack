// `fs` and `path` come from the runner (`moduleScope` in `test.config.js`):
// bundling them would make this universal build warn.

// Exported (so this is an ESM library) but never instantiated — the assertion only
// checks that the worker chunk is referenced by an analyzable `new URL(...)` literal.
export const createWorker = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

it("should emit an analyzable new URL for a worker in a module library", () => {
	expect(typeof createWorker).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The worker chunk is referenced by a literal `new URL(..., import.meta.url)`
	// instead of the runtime publicPath + getChunkScriptFilename form.
	expect(bundle).toContain("/* worker import */");
	expect(bundle).toContain("new URL(/* worker import */");
	expect(bundle).toMatch(/export\s*\{/);
});
