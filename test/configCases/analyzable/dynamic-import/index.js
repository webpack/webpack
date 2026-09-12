import fs from "fs";
import path from "path";

it("should load the dynamically imported chunk", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should emit an analyzable literal import() for module output", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The loader imports a statically-named specifier a foreign bundler can follow;
	// the importing module names only the chunk id.
	const importMap = `${"chunkImports"} = {`;

	expect(bundle).toContain(importMap);
	expect(bundle).toContain('import("./dynamic.mjs")');
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
	// The runtime builds no name from a chunk id, so it ships no map of them.
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
