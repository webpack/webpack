import fs from "fs";
import path from "path";

it("should bake past a runtime chunk whose hash it may not read", async () => {
	const mod = await import("./lazy.js");
	expect(mod.default).toBe("lazy");
	const dir = __STATS__.outputPath;
	const runtime = __STATS__.assets.find((asset) =>
		asset.name.startsWith("runtime.")
	).name;
	const lazy = __STATS__.assets.find((asset) =>
		asset.name.startsWith("lazy_js.")
	).name;
	const source = fs.readFileSync(path.join(dir, runtime), "utf8");

	expect(source).toContain(`"./${lazy}"`);
});
