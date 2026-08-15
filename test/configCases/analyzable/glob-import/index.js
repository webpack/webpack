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

	// One per match, and none of them left on the runtime form.
	expect(bundle.split(`${"__webpack_require__"}.ei(`)).toHaveLength(3);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
});
