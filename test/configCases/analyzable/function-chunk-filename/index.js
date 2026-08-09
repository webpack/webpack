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
		// Whatever the name holds, what is baked has to be a file on disk.
		const specifier = /import\((?:\/\*[^*]*\*\/\s*)?"([^"]+)"\)/.exec(
			bundle.slice(bundle.indexOf(helper))
		);

		expect(specifier).not.toBe(null);
		expect(
			fs.existsSync(path.join(__STATS__.children[0].outputPath, specifier[1]))
		).toBe(true);
	} else {
		expect(bundle).not.toContain(helper);
	}
});
