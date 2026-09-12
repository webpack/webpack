import fs from "fs";
import path from "path";

it("should load through the runtime form without baking the chunk name", async () => {
	const mod = await import("./lazy.js");
	expect(mod.default).toBe("lazy");
	const dir = __STATS__.outputPath;
	const entry = __STATS__.assets.find((asset) =>
		asset.name.startsWith("main.")
	).name;
	const lazy = __STATS__.assets.find((asset) =>
		asset.name.startsWith("lazy_js.")
	).name;
	const source = fs.readFileSync(path.join(dir, entry), "utf8");
	// The content hash of the lazy chunk, which is what a baked name would have
	// carried into the entry — and what would invalidate it on every lazy change.
	const [, hash] = lazy.split(".");

	expect(source).not.toContain(lazy);
	expect(source).not.toContain(hash);
	expect(source).not.toContain(`${"__webpack_require__"}.ei(`);
	expect(source).toContain(`${"__webpack_require__"}.e(`);
	// It still reaches the loader, from the map the runtime chunk holds alone.
	const runtime = __STATS__.assets.find((asset) =>
		asset.name.startsWith("runtime.")
	).name;

	expect(fs.readFileSync(path.join(dir, runtime), "utf8")).toContain(hash);
});
