import fs from "fs";
import path from "path";

// Exported so this is an ESM library; the asset URL is emitted as an analyzable
// `new URL("./asset.txt", import.meta.url)` literal a foreign bundler can follow.
export const assetUrl = new URL("./asset.txt", import.meta.url);

it("should resolve an analyzable asset URL from a module library", () => {
	expect(assetUrl.protocol).toBe("file:");
	expect(assetUrl.pathname.endsWith("/asset.txt")).toBe(true);
	expect(fs.readFileSync(assetUrl, "utf8")).toContain("the asset content");
});

it("should emit an analyzable new URL literal in the library output", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(bundle).toContain('/* asset import */ "./asset.txt", import.meta.url');
	expect(bundle).toMatch(/export\s*\{/);
});
