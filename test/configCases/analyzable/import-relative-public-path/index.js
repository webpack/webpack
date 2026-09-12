import fs from "fs";
import path from "path";

const stats = __STATS__.children[__INDEX__];

it("should load a chunk imported from a chunk below the output root", async () => {
	const mid = await import(/* webpackChunkName: "nested/mid" */ "./mid");
	expect((await mid.deeper()).value).toBe("lazy");
});

it("should walk back to the output root before the public path", () => {
	// The loader's map sits in the entry bundle, one directory below the root.
	const source = fs.readFileSync(
		path.join(stats.outputPath, __DIR__, "entry", "main.mjs"),
		"utf8"
	);

	expect(source).toContain(`"${__SPECIFIER__}")`);
});
