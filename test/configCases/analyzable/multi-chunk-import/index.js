import fs from "fs";
import path from "path";

it("should load a dynamic import split across chunks", async () => {
	const { default: value } = await import("./target.js");

	expect(value).toBe(42);
});

it("should emit analyzable literal imports for each split chunk", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The `import()` splits into the target chunk + an enforced vendor chunk, both
	// named in the loader's map while the importing module asks for the two ids.
	const importMap = `${"chunkImports"} = {`;

	expect(bundle).toContain(importMap);
	expect(bundle).toContain('import("./vendor.mjs")');
	expect(bundle).toContain('import("./target_js.mjs")');
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
});
