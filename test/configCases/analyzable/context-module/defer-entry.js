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

	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(3);
	expect(bundle).toContain("return ids[1][0]()");
	// An async candidate defers nothing, so its trailing slot is written out empty.
	expect(bundle).toContain(`import("./${__NAME__}-defer_async_js.mjs")`);
	expect(bundle).toContain("], null]");
	expect(bundle).not.toContain(`${"__webpack_require__"}.e =`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u =`);
});
