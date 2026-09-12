import fs from "fs";
import path from "path";

const CHUNK_REFERENCE = /"\.[^"]*\.mjs"/g;

it("should load from chunks at different depths", async () => {
	const flat = await import(/* webpackChunkName: "flat" */ "./flat");
	expect((await flat.load()).value).toBe("lazy");
	// Pull in the second, deeper copy so the module really sits at two depths.
	const deep = await import(/* webpackChunkName: "nested/deep" */ "./deep");
	expect((await deep.load()).value).toBe("lazy");
});

it("should name the shared chunk once, whatever depths reach it", () => {
	const dir = __STATS__.outputPath;
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");

	// The module holding the `import()` sits at two depths, but neither chunk names
	// anything — so no reference needs a `../` path of its own.
	expect(read("flat.mjs").match(CHUNK_REFERENCE)).toBe(null);
	expect(read(path.join("nested", "deep.mjs")).match(CHUNK_REFERENCE)).toBe(
		null
	);

	// One specifier per chunk, spelled from where the loader sits.
	const bundle = read("bundle0.mjs");
	const referenced = bundle.match(CHUNK_REFERENCE) || [];

	// Needles built here so they are not source string literals this file reads back.
	const shared = `"./${"lazy"}.mjs"`;
	const deepChunk = `"./nested/${"deep"}.mjs"`;

	expect(bundle).toContain(`${"chunkImports"} = {`);
	expect(referenced.filter((ref) => ref === shared)).toHaveLength(1);
	expect(referenced).toContain(deepChunk);
});
