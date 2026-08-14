import fs from "fs";
import path from "path";

it("should resolve the asset from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect(fs.readFileSync(flat.url, "utf8")).toContain("the asset content");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect(fs.readFileSync(deep.url, "utf8")).toContain("the asset content");
});

it("should bake each depth's specifier unless the name moves with the content", () => {
	const outputPath = __STATS__.children[__INDEX__].outputPath;
	// The two configs share an output directory, so each names its chunks apart; the
	// hashed one is found by prefix.
	const read = (dir, prefix) => {
		const found = fs
			.readdirSync(path.join(outputPath, dir))
			.find((name) => name.startsWith(prefix));
		return fs.readFileSync(path.join(outputPath, dir, found), "utf8");
	};
	// Needle built at runtime so it is not a source string literal here.
	const publicPath = `${"__webpack_require__"}.p`;

	if (__ANALYZABLE__) {
		expect(read(".", "flat-0")).toContain('"./asset.txt", import.meta.url');
		expect(read("nested", "deep-0")).toContain('"../asset.txt", import.meta.url');
	} else {
		expect(read(".", "flat-1")).toContain(publicPath);
		expect(read("nested", "deep-1")).toContain(publicPath);
	}
});
