import fs from "fs";
import path from "path";

it("should load the hashed chunk whichever form is emitted", async () => {
	const lazy = await import(/* webpackChunkName: "lazy" */ "./lazy");
	expect(lazy.value).toBe("lazy");
});

it("should bake the settled hash only when a stale name would be corrected", () => {
	const dir = __STATS__.children[0].outputPath;
	// Needle built at runtime so it is not a source string literal here.
	const helper = `${"__webpack_require__"}.ei(`;
	const emitted = fs
		.readdirSync(dir)
		.find((file) => /^a-lazy\.[\da-f]+\.mjs$/.test(file));

	expect(emitted).toBeDefined();
	const baked = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");

	expect(baked).toContain(helper);
	// A leading comment sits between `import(` and its specifier.
	expect(baked).toContain(`"./${emitted}")`);
	// No stand-in may reach the bundle, cached rebuild included.
	expect(baked).not.toContain(`@@${"webpackAnalyzableChunk"}:`);

	expect(fs.readFileSync(path.join(dir, "bundle1.mjs"), "utf8")).not.toContain(
		helper
	);
});
