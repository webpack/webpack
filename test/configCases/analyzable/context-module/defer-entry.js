import fs from "fs";
import path from "path";

const load = (name) => import.defer(`./defer/${name}.js`);

it("should load a deferred candidate either way", async () => {
	expect((await load("sync")).default).toBe("sync");
	expect((await load("async")).default).toBe("async");
});

it("should keep the loaders ahead of the deferred slot", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	const importMap = `${"chunkImports"} = {`;
	const start = bundle.indexOf(importMap);

	expect(start).not.toBe(-1);
	const region = bundle.slice(start, bundle.indexOf("};", start));

	expect(region.split("import(")).toHaveLength(3);
	expect(bundle).toContain(`return ${"__webpack_require__"}.e(ids[1][0])`);
	// Both candidates are named, whether or not the deferred slot behind them is empty.
	expect(region).toContain(`import("./${__NAME__}-defer_async_js.mjs")`);
	expect(region).toContain(`import("./${__NAME__}-defer_sync_js.mjs")`);
	expect(bundle).toContain("], null]");
	expect(bundle).toContain(`${"__webpack_require__"}.e =`);
});
