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

	// One per candidate, and every one of them in the map itself.
	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(3);
	expect(bundle).toContain(`import("./${__NAME__}-locales_de_js.mjs")`);
	expect(bundle).toContain(`import("./${__NAME__}-locales_en_js.mjs")`);
	// A single chunk per request needs no `Promise.all` around it.
	expect(bundle).toContain("return ids[1][0]()");
	// Nothing loads a chunk by id any more, so neither runtime module ships.
	expect(bundle).not.toContain(`${"__webpack_require__"}.e =`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
