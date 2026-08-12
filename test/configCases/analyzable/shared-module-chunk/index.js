import fs from "fs";
import path from "path";

it("should load a chunk that also holds a shared module", async () => {
	const lazy = await import(/* webpackChunkName: "lazy" */ "./lazy");
	expect(lazy.load()).toBe("shared");
});

it("should bake the specifier — the chunk's javascript is emitted here", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).toContain('"./lazy.mjs"');
});
