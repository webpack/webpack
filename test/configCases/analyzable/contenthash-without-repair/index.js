import fs from "fs";
import path from "path";

it("should bake the name with no repair pass behind it", async () => {
	const mod = await import("./lazy.js");
	expect(mod.default).toBe("lazy");
	const dir = __STATS__.outputPath;
	const entry = __STATS__.assets.find((asset) =>
		asset.name.startsWith("bundle0.")
	).name;
	const lazy = __STATS__.assets.find((asset) =>
		asset.name.startsWith("lazy_js.")
	).name;
	const source = fs.readFileSync(path.join(dir, entry), "utf8");

	const importMap = `${"chunkImports"} = {`;
	const start = source.indexOf(importMap);

	expect(start).not.toBe(-1);
	// Read inside the map, so the name cannot be matched from anywhere else in the chunk.
	const region = source.slice(start, source.indexOf("};", start));

	expect(region).toContain(`"./${lazy}"`);
	expect(source).not.toContain(`${"__webpack_require__"}.u(`);
});
