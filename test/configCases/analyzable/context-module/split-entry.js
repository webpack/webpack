import fs from "fs";
import path from "path";

const load = (name) => import(`./split/${name}.js`);

it("should load a candidate spread over two chunks", async () => {
	expect((await load("de")).default).toBe("de!");
	expect((await load("en")).default).toBe("en!");
});

it("should write one static import per chunk of the request", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// Two candidates plus the chunk they share, each named once — the map is keyed
	// by chunk id, so a shared chunk is not repeated per request.
	const importMap = `${"chunkImports"} = {`;
	const start = bundle.indexOf(importMap);

	expect(start).not.toBe(-1);
	const region = bundle.slice(start, bundle.indexOf("};", start));

	expect(region.split("import(")).toHaveLength(4);
	expect(bundle).toContain(`import("./${__NAME__}-shared.mjs")`);
	expect(bundle).toContain(`import("./${__NAME__}-split_de_js.mjs")`);
	expect(bundle).toContain(`Promise.all(ids[1].map(${"__webpack_require__"}.e))`);
	expect(bundle).toContain(`${"__webpack_require__"}.e =`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
