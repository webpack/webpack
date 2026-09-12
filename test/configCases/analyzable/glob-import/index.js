const fs = require("fs");
const path = require("path");

it("should load every glob match", async () => {
	const mods = import.meta.glob("./mods/*.js");
	const loaded = {};

	for (const key of Object.keys(mods)) {
		loaded[key] = (await mods[key]()).value;
	}

	expect(loaded).toEqual({ "./mods/a.js": "a", "./mods/b.js": "b" });
});

it("should bake the import for every glob match", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	const importMap = `${"chunkImports"} = {`;
	const start = bundle.indexOf(importMap);

	expect(start).not.toBe(-1);
	// One entry per match, and no name built from a chunk id beside them.
	const region = bundle.slice(start, bundle.indexOf("};", start));

	expect(region.split("import(")).toHaveLength(3);
});
