import fs from "fs";
import path from "path";

// Output is not cleaned between steps, so a stale reference can still resolve
// on disk: check it against the assets of the current compilation instead.
it("should reference the current file name of a runtime chunk", () => {
	const stats = STATS_JSON.children.find((child) => child.name === NAME);
	expect(stats.errors).toHaveLength(0);
	const assets = new Set(stats.assets.map((asset) => asset.name));
	const references = [];
	for (const name of assets) {
		const source = fs.readFileSync(path.join(stats.outputPath, name), "utf8");
		const referencePattern = /(?:from |require\()"\.\/([^"]+)"/g;
		let match;
		while ((match = referencePattern.exec(source)) !== null) {
			references.push(match[1]);
			expect(assets).toContain(match[1]);
		}
	}
	expect(
		references.some((request) => request.startsWith("runtime~main-"))
	).toBe(true);
});
