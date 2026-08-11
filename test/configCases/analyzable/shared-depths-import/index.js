import fs from "fs";
import path from "path";

it("should load through the analyzable form from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect((await flat.load()).value).toBe("lazy");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect((await deep.load()).value).toBe("lazy");
});

it("should bake the specifier each depth needs", () => {
	const read = (name) =>
		fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");

	expect(read("flat.mjs")).toContain('"./lazy.mjs"');
	expect(read("nested/deep.mjs")).toContain('"../lazy.mjs"');
	expect(read("flat.mjs")).not.toContain(`${"__webpack_require__"}.e(`);
});
