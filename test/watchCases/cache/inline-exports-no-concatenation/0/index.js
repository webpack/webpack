import { VALUE } from "./env";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// Without concatenation the literal comes from RuntimeTemplate rather than
// from ConcatenatedModule, so this covers the other renderer.
it("should refresh the inlined literal when modules are not concatenated", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expected = Number(WATCH_STEP) + 10;
	expect(VALUE).toBe(expected);
	expect(source).toContain(`(/* inlined export .VALUE */${expected})`);
});
