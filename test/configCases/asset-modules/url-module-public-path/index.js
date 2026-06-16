import fs from "fs";
import path from "path";

it("should resolve new URL(..., import.meta.url) against a static publicPath", () => {
	const url = new URL("./file.png", import.meta.url);

	expect(url.href).toBe("https://example.com/assets/file.png");
});

it("should drop the asset's JS wrapper and emit the analyzable literal", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needles are built at runtime so they are not present as source string
	// literals in the bundle — the only match is the transformed `new URL` call.
	const marker = `/* asset ${"import"} */`;
	const publicPathGlobal = `${"__webpack_require__"}.p`;
	const baseURI = `${"__webpack_require__"}.b`;

	expect(bundle).toContain(
		`new URL(${marker} "https://example.com/assets/file.png", import.meta.url)`
	);
	// The asset is consumed as `asset-url`, so no `module.exports` wrapper and no
	// publicPath/baseURI runtime globals are emitted for it.
	expect(bundle).not.toContain(publicPathGlobal);
	expect(bundle).not.toContain(baseURI);
});
