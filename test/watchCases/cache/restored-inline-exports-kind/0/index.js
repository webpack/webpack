import value from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// Each kind renders its own literal, so a refreshed cache can keep the old text.
const steps = [
	[1, "1"],
	["ab", '"ab"'],
	[true, "true"],
	[null, "null"],
	[undefined, "undefined"],
	[2, "2"]
];

it("should refresh every kind of inlined literal in a restored consumer", () => {
	const [expected, literal] = steps[Number(WATCH_STEP)];
	expect(value).toBe(expected);
	expect(emitted("bundle.js")).toContain(`inlined export .VALUE */${literal}`);
});
