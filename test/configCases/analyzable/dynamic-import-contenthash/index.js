import fs from "fs";
import path from "path";

it("should load a chunk whose filename uses a digest-suffixed content hash", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should bake a hashed chunk name the deferred pass fills in", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needle built at runtime so it is not a source string literal here.
	const helper = `${"__webpack_require__"}.ei(`;

	expect(bundle).toContain(helper);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
	// No stand-in may reach the bundle, and what is baked has to be on disk.
	expect(bundle).not.toContain(`@@${"webpackAnalyzableChunk"}:`);
	const specifier = /import\((?:\/\*[^*]*\*\/\s*)?"([^"]+)"\)/.exec(
		bundle.slice(bundle.indexOf(helper))
	);

	expect(specifier).not.toBe(null);
	expect(
		fs.existsSync(path.join(__STATS__.outputPath, specifier[1]))
	).toBe(true);
});
