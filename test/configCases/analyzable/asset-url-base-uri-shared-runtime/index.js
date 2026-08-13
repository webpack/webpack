import fs from "fs";
import path from "path";

it("should not bake one entry's base into a chunk the other also loads", async () => {
	const mod = await import(/* webpackChunkName: "shared" */ "./async.js");
	expect(mod.default.href).toBe("https://example.com/base/asset.txt");
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "shared.chunk.mjs"),
		"utf8"
	);
	// `other` sets no base, so a literal built from this entry's would be wrong there.
	expect(source).not.toContain("https://example.com/base/");
	// Without this the check above would pass just as well on an empty chunk.
	expect(source).toContain("asset.txt");
});
