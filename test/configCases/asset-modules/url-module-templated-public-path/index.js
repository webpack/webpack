import fs from "fs";
import path from "path";

it("should bake the fullhash publicPath into the analyzable asset URL", () => {
	const url = new URL("./file.png", import.meta.url);

	expect(url.href).toBe(`https://example.com/${__STATS__.hash}/file.png`);

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The `[fullhash]` publicPath is unknown at code generation; the placeholder
	// is substituted post-hash, so the call site is a literal that needs no
	// runtime baseURI. (The asset's JS wrapper keeps the runtime publicPath.)
	const marker = `/* asset ${"import"} */`;
	const baseURI = `${"__webpack_require__"}.b`;

	expect(bundle).toContain(
		`new URL(${marker} "https://example.com/${__STATS__.hash}/file.png", import.meta.url)`
	);
	expect(bundle).not.toContain(baseURI);
});
