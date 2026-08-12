import fs from "fs";
import path from "path";

it("should load through the runtime form from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect((await flat.load()).value).toBe("lazy");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect((await deep.load()).value).toBe("lazy");
});

it("should not bake a specifier no depth-independent name can carry", () => {
	// Found rather than named: these chunks carry a content hash.
	const dir = __STATS__.outputPath;
	const name = fs.readdirSync(dir).find((file) => file.startsWith("flat."));
	const source = fs.readFileSync(path.join(dir, name), "utf8");

	expect(source).toContain(`${"__webpack_require__"}.e(`);
	expect(source).not.toContain(`${"__webpack_require__"}.ei(`);
});
