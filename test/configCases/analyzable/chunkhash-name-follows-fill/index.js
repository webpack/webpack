import fs from "fs";
import path from "path";

it("should bake the name into a chunk its own content names", async () => {
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

	// Nothing repairs `[chunkhash]` after a fill, so the literal is only sound because
	// the fold put it into this chunk's hash first.
	expect(source).toContain(`${"__webpack_require__"}.ei(`);
	expect(source).toContain(`"./${lazy}"`);
	expect(source).not.toContain(`${"__webpack_require__"}.u(`);
});
