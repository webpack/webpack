import fs from "fs";
import path from "path";

// Output is not cleaned between steps, so a stale import can still resolve on
// disk: check it against the assets of the current compilation instead.
it("should import the current file name of every imported chunk", () => {
	const stats = STATS_JSON.children.find((child) => child.name === NAME);
	expect(stats.errors).toHaveLength(0);
	const assets = new Set(stats.assets.map((asset) => asset.name));
	const imports = [];
	for (const name of assets) {
		if (!name.endsWith(".mjs")) continue;
		const source = fs.readFileSync(
			path.join(stats.outputPath, name),
			"utf8"
		);
		const importPattern = /from "\.\/([^"]+)"/g;
		let match;
		while ((match = importPattern.exec(source)) !== null) {
			imports.push(match[1]);
			expect(assets).toContain(match[1]);
		}
	}
	expect(imports.some((request) => request.startsWith("lib-"))).toBe(true);
	expect(imports.some((request) => request.startsWith("parent-"))).toBe(true);
	for (const name of assets) {
		if (!/^(main|child)-/.test(name)) continue;
		const source = fs.readFileSync(path.join(stats.outputPath, name), "utf8");
		expect(source).not.toContain("lib-v");
		expect(source).not.toContain("parent-v");
	}
});
