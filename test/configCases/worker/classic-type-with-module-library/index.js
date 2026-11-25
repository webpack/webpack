export const createWorker = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "classic" });

it("should preserve the explicit classic worker type with a module library", () => {
	expect(typeof createWorker).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle.mjs"),
		"utf8"
	);
	expect(bundle).toMatch(
		/new __webpack_require__\.wc\(new URL\([^)]*\), \{ type: "classic" \}\)/
	);
});
