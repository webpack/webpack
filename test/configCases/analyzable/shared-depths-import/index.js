import fs from "fs";
import path from "path";

it("should load through the runtime form from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect((await flat.load()).value).toBe("lazy");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect((await deep.load()).value).toBe("lazy");
});

it("should not bake a specifier that only holds at one depth", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "flat.mjs"),
		"utf8"
	);

	expect(source).toContain(`${"__webpack_require__"}.e(`);
	expect(source).not.toContain(`${"__webpack_require__"}.ei(`);
});
