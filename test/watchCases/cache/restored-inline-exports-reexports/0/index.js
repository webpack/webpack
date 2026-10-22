import values from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

it("should refresh an inlined literal reached through re-exports", () => {
	const value = Number(WATCH_STEP) + 1;
	expect(values).toEqual([value, value]);
	const bundle = emitted("bundle.js");
	// A renamed re-export still renders under the name the leaf exports
	expect(bundle).toContain(`inlined export .LEAF */${value}`);
	expect(bundle).not.toContain(`inlined export .LEAF */${value - 1}`);
});
