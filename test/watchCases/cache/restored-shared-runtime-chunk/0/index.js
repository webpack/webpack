import { FROM_SHARED } from "./shared.js";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// A chunk shared by two entrypoints carries a runtime set, hashed on its own branch.
it("should refresh an inlined literal in a chunk shared by two runtimes", () => {
	const value = Number(WATCH_STEP) + 1;
	expect(FROM_SHARED).toBe(value);
	const sources = STATS_JSON.assets
		.filter((asset) => /\.js$/.test(asset.name))
		.map((asset) => emitted(asset.name))
		.join("\n");
	expect(sources).not.toContain(`inlined export .VALUE */${value - 1}`);
});
