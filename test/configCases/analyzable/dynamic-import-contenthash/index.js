import fs from "fs";
import path from "path";

it("should load a chunk whose filename uses a digest-suffixed content hash", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should bake the hashed chunk filename into an analyzable import", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The content hash is unknown at code generation, so a placeholder is baked
	// and substituted post-hash — the literal must name the emitted chunk file.
	const match = /"\.\/(dynamic\.[^"]+\.mjs)"\)/.exec(bundle);
	expect(match).not.toBe(null);
	expect(fs.existsSync(path.join(__STATS__.outputPath, match[1]))).toBe(true);
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
});

it("should leave placeholder-like user strings untouched", () => {
	const decoyChunk = "___WEBPACK_ANALYZABLE_CHUNK_zz___";
	const decoyPublicPath = "___WEBPACK_ANALYZABLE_PUBLIC_PATH___";
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// An unknown chunk token and a publicPath token without a templated publicPath
	// were not emitted by webpack, so the substitution pass must not touch them.
	expect(bundle).toContain(decoyChunk);
	expect(bundle).toContain(decoyPublicPath);
});
