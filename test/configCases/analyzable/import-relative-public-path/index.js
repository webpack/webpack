import fs from "fs";
import path from "path";

const stats = __STATS__.children[__INDEX__];

it("should load a chunk imported from a chunk below the output root", async () => {
	const mid = await import(/* webpackChunkName: "nested/mid" */ "./mid");
	expect((await mid.deeper()).value).toBe("lazy");
});

it("should walk back to the output root before the public path", () => {
	const source = fs.readFileSync(
		path.join(stats.outputPath, __DIR__, "nested/mid.mjs"),
		"utf8"
	);

	expect(source).toContain(`"${__SPECIFIER__}")`);
});
