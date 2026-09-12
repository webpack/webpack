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

it("should need no stand-in, so nothing to repair", () => {
	// Found rather than named: these chunks carry a content hash.
	const dir = __STATS__.outputPath;
	const names = fs.readdirSync(dir);
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
	const flat = /** @type {string} */ (
		names.find((f) => f.startsWith("flat."))
	);

	// The chunks holding the reference are named by their content, but they name
	// nothing — so no stand-in lands in them and no name of theirs goes stale.
	expect(read(flat).match(CHUNK_REFERENCE)).toBe(null);

	const bundle = read("bundle0.mjs");

	expect(bundle).toContain(`${"chunkImports"} = {`);
	// Every name the loader spells is a file that was emitted under it — a nested
	// chunk sits in its own directory, so the whole path is checked, not the listing.
	for (const ref of bundle.match(CHUNK_REFERENCE) || []) {
		const file = path.join(dir, ...ref.slice(3, -1).split("/"));

		expect([ref, fs.existsSync(file)]).toEqual([ref, true]);
	}
});
