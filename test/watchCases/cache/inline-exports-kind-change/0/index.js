import { VALUE } from "./env";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const EXPECTED = {
	0: { value: 1, literal: "1" },
	1: { value: "ab", literal: '"ab"' },
	2: { value: true, literal: "true" },
	3: { value: null, literal: "null" },
	4: { value: undefined, literal: "undefined" },
	5: { value: 2, literal: "2" }
};

it("should refresh the inlined literal when the exported value changes kind", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expected = EXPECTED[WATCH_STEP];
	expect(VALUE).toBe(expected.value);
	expect(source).toContain(`(/* inlined export .VALUE */${expected.literal})`);
});
