import fs from "fs";
import path from "path";

const load = (name) => import(`./locales/${name}.js`);

it("should load every candidate of the context", async () => {
	expect((await load("de")).default).toBe("de");
	expect((await load("en")).default).toBe("en");
});

it("should write a static import next to each request", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// One entry per candidate, all of them in the loader's map.
	const importMap = `${"chunkImports"} = {`;
	const start = bundle.indexOf(importMap);

	expect(start).not.toBe(-1);
	const region = bundle.slice(start, bundle.indexOf("};", start));

	expect(region.split("import(")).toHaveLength(3);
	expect(bundle).toContain(`import("./${__NAME__}-locales_de_js.mjs")`);
	expect(bundle).toContain(`import("./${__NAME__}-locales_en_js.mjs")`);
	// A single chunk per request needs no `Promise.all` around it.
	expect(bundle).toContain(`return ${"__webpack_require__"}.e(ids[1][0])`);
	// The request map holds chunk ids, so the loader reads them — but it imports a
	// name from its own map, so no id is ever turned into a filename.
	expect(bundle).toContain(`${"__webpack_require__"}.e =`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
