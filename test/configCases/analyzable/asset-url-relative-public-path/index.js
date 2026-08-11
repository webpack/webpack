import fs from "fs";
import path from "path";

const stats = __STATS__.children[__INDEX__];

it("should resolve the asset from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect(fs.readFileSync(flat.url, "utf8")).toContain("the asset content");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect(fs.readFileSync(deep.url, "utf8")).toContain("the asset content");
});

it("should walk back to the output root before the public path", () => {
	const read = (name) =>
		fs.readFileSync(path.join(stats.outputPath, __DIR__, name), "utf8");

	expect(read("flat.mjs")).toContain(`"${__FLAT__}", import.meta.url`);
	expect(read("nested/deep.mjs")).toContain(`"${__DEEP__}", import.meta.url`);
});
