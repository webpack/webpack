import fs from "fs";
import path from "path";

it("should load the chunk whichever form is emitted", async () => {
	const lazy = await import(/* webpackChunkName: "lazy" */ "./lazy");
	expect(lazy.value).toBe("lazy");
});

it("should bake the literal only when the name holds no hash", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, `bundle${__INDEX__}.mjs`),
		"utf8"
	);
	// Needle built at runtime so it is not a source string literal here.
	const helper = `${"__webpack_require__"}.ei(`;

	if (__ANALYZABLE__) {
		expect(bundle).toContain(helper);
		expect(bundle).toContain('import("./a-lazy/lazy.mjs")');
	} else {
		expect(bundle).not.toContain(helper);
	}
});
