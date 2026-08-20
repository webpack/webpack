import fs from "fs";
import path from "path";

const load = (name) => import(`./mixed/${name}.js`);

it("should load a candidate either way round", async () => {
	expect((await load("de")).default).toBe("de");
	expect((await load("en")).default).toBe("en");
});

it("should keep the runtime form for the chunk it cannot import", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// `de` was split into the chunk carrying the runtime: importing that from itself
	// would be a cycle, so only `en` is baked.
	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(2);
	expect(bundle).toContain(`import("./${__NAME__}-mixed_en_js.mjs")`);
	expect(bundle).toContain(`${"__webpack_require__"}.e(${JSON.stringify(__NAME__)})`);
	// One loader still asks for it, so the runtime module has to ship.
	expect(bundle).toContain(`${"__webpack_require__"}.e =`);
});
