import fs from "fs";
import path from "path";

it("should resolve the asset from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect(fs.readFileSync(flat.url, "utf8")).toContain("the asset content");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect(fs.readFileSync(deep.url, "utf8")).toContain("the asset content");
});

it("should bake the specifier each depth needs", () => {
	const read = (name) =>
		fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");

	expect(read("flat.mjs")).toContain('"./asset.txt", import.meta.url');
	expect(read("nested/deep.mjs")).toContain('"../asset.txt", import.meta.url');
	// No `__webpack_require__.b` — the runtime form resolves against the base uri.
	expect(read("flat.mjs")).not.toContain(`${"__webpack_require__"}.b`);
	expect(read("nested/deep.mjs")).not.toContain(`${"__webpack_require__"}.b`);
});
