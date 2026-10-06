import values from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// Every consumer bakes in its own copy, so invalidating one is not enough.
it("should refresh an inlined literal in every consumer", () => {
	const value = Number(WATCH_STEP) + 1;
	expect(values).toEqual([value, value, value]);
	expect(emitted("bundle.js")).not.toContain(
		`inlined export .VALUE */${value - 1}`
	);
});
