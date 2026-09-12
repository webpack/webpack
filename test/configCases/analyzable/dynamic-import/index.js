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
	// Every chunk the loader can be asked for is named here, so it builds no url from
	// a chunk id and the table mapping one to a filename is not emitted.
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
