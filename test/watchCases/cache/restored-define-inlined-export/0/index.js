import flag from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// The value changes in the configuration, never in a module's source.
it("should refresh a restored consumer when a define changes an inlined export", () => {
	const expected = ["on", "off"][Number(WATCH_STEP)];
	expect(flag).toBe(expected);
	expect(emitted("bundle.js")).toContain(
		`inlined export .FLAG */${JSON.stringify(expected)}`
	);
});
