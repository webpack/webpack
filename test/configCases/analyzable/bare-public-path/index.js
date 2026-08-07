import fs from "fs";
import path from "path";

it("should load a chunk when the public path is empty", async () => {
	// A bare `import("async_js.mjs")` would be looked up as a package.
	const m = await import("./async");

	expect(m.value).toBe(42);
});

it("should still emit the analyzable literal", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);

	expect(bundle).toContain('import("./async_js.mjs")');
});
