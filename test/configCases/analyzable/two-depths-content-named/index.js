import fs from "fs";
import path from "path";

const CHUNK_REFERENCE = /"\.[^"]*\.mjs"/g;

const load = () =>
	Promise.all([
		import(/* webpackChunkName: "flat" */ "./flat"),
		import(/* webpackChunkName: "nested/deep" */ "./nested/deep")
	]);

it("should reach the chunk two depths share by one path", async () => {
	const [flat, deep] = await load();
	expect(await flat.load()).toBe("async");
	expect(await deep.load()).toBe("async");

	const dir = __STATS__.outputPath;
	const nameOf = (prefix) =>
		__STATS__.assets.find((asset) => asset.name.startsWith(prefix)).name;
	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");

	// One copy sits at the output root and the other a directory down, but neither
	// names the chunk they share — so it is not reached by two different literals.
	expect(read(nameOf("flat.")).match(CHUNK_REFERENCE)).toBe(null);
	expect(read(nameOf("nested/deep.")).match(CHUNK_REFERENCE)).toBe(null);

	const bundle = read("bundle0.mjs");
	const shared = nameOf("async");

	expect(bundle).toContain(`${"chunkImports"} = {`);
	expect(bundle).toContain(`"./${shared}"`);
});
