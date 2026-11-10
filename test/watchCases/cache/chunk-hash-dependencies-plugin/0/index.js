import fs from "fs";
import path from "path";

// Output is not cleaned between steps, so a stale name can still resolve on
// disk: check it against the assets of the current compilation instead.
it("should name the current file of a chunk declared as a hash dependency", () => {
	const stats = STATS_JSON.children.find((child) => child.name === NAME);
	expect(stats.errors).toHaveLength(0);
	const assets = new Set(stats.assets.map((asset) => asset.name));
	const main = [...assets].find((name) => name.startsWith("main-"));
	const source = fs.readFileSync(path.join(stats.outputPath, main), "utf8");
	const match = /\/\/ other: "\.\/([^"]+)"/.exec(source);
	expect(match).not.toBe(null);
	expect(assets).toContain(match[1]);
});
