import fs from "fs";
import path from "path";

it("should load the hashed chunk whichever form is emitted", async () => {
	const lazy = await import(/* webpackChunkName: "lazy" */ "./lazy");
	expect(lazy.value).toBe("lazy");
});

it("should bake a name that is really on disk", () => {
	const dir = __STATS__.children[0].outputPath;
	// Needles built at runtime so they are not source string literals here.
	const importMap = `${"chunkImports"} = {`;
	const bundle = fs.readFileSync(
		path.join(dir, `bundle${__INDEX__}.mjs`),
		"utf8"
	);

	if (!__ANALYZABLE__) {
		expect(bundle).not.toContain(importMap);
		return;
	}
	expect(bundle).toContain(importMap);
	// No stand-in may reach the bundle, cached rebuild included.
	expect(bundle).not.toContain(`@@${"webpackAnalyzableChunk"}:`);

	// Anchored past the map so the pattern cannot match its own source below.
	const specifier = /import\((?:\/\*[^*]*\*\/\s*)?"([^"]+)"\)/.exec(
		bundle.slice(bundle.indexOf(importMap))
	);

	expect(specifier).not.toBe(null);
	expect(fs.existsSync(path.join(dir, specifier[1]))).toBe(true);
});
