import fs from "fs";
import path from "path";

it("should load through baked specifiers from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect((await flat.load()).value).toBe("lazy");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect((await deep.load()).value).toBe("lazy");
});

it("should bake a per-asset specifier and repair the names it lands in", () => {
	// Found rather than named: these chunks carry a content hash.
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir);
	const source = fs.readFileSync(
		path.join(dir, /** @type {string} */ (names.find((f) => f.startsWith("flat.")))),
		"utf8"
	);

	expect(source).toContain(`${"__webpack_require__"}.ei(`);
	expect(source).not.toContain(`${"__webpack_require__"}.e(`);
	// The repaired name is the one the reference spells.
	for (const ref of source.match(/"\.\/[^"]+\.mjs"/g) || []) {
		expect(names).toContain(ref.slice(3, -1));
	}
});
