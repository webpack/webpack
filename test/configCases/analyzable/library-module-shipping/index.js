import fs from "fs";
import path from "path";

// Named exports make each of these an ESM library, so the analyzable literals are
// asserted next to the library's own `export { ... }`. Both are exported rather than
// used behind a flag: a reference nothing exports is shaken out, taking the chunk
// and the asset with it.
export const value = 42;
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");
export const assetUrl = new URL("./asset.txt", import.meta.url).href;

const bundle = () =>
	fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, `bundle${__INDEX__}.mjs`),
		"utf8"
	);

if (__ON_DISK__) {
	it("should load the chunk a module library names by a literal", async () => {
		const lazy = await load();

		expect(lazy.value).toBe("lazy");
	});
}

it("should bake a literal chunk specifier into a module library", () => {
	const source = bundle();
	// Built at runtime so the needle is not a source string literal here — this file
	// is bundled into what it reads back.
	const helper = `${"__webpack_require__"}.ei(`;

	expect(source).toMatch(/export\s*\{/);
	expect(source).toContain(helper);

	// A chunk `import()` needs no `import.meta`, so it bakes even where the module
	// body is wrapped for the eval devtool — quoted with escapes there, plain here.
	const specifier = /import\((?:\/\*[^*]*\*\/\s*)?\\?"([^"\\]+)\\?"\)/.exec(
		source.slice(source.indexOf(helper))
	);

	expect(specifier).not.toBe(null);
	if (__ON_DISK__) {
		expect(
			fs.existsSync(path.join(__STATS__.children[0].outputPath, specifier[1]))
		).toBe(true);
	} else {
		// The public path carries the compilation hash, so the deferred pass filled it
		// in rather than leaving a stand-in behind.
		expect(specifier[1]).toMatch(
			/^https:\/\/cdn\.example\.invalid\/[\da-f]+\/2-lazy\.mjs$/
		);
	}
});

it("should bake an asset url only where import.meta survives", () => {
	const source = bundle();
	const evalCall = `${"eval"}(`;
	const baseUri = `${"__webpack_require__"}.b`;

	if (__URL_FORMS_BAKE__) {
		expect(source).not.toContain(evalCall);
		expect(source).toMatch(/new URL\((?:\/\*[^*]*\*\/\s*)?"[^"]*asset\.txt"/);
		expect(source).not.toContain(baseUri);
	} else {
		// `import.meta` does not parse inside an eval wrapper, so the url is built
		// against the base uri the runtime holds instead of being spelled here.
		expect(source).toContain(evalCall);
		expect(source).toContain(baseUri);
		expect(source).not.toMatch(/new URL\((?:\/\*[^*]*\*\/\s*)?\\?"[^"]*asset\.txt/);
	}
});
