import { SHORT, NUM } from "./env";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// This file is part of the bundle it reads, so the marker is assembled here
// to keep an assertion from matching its own source text.
const MARK = ["inlined", "export"].join(" ");

// Inlining stops above 6 bytes, so these steps cross the limit in both
// directions: a cached consumer must gain and lose the literal again.
const EXPECTED = {
	0: { short: "abc", num: 1, inlined: true },
	1: { short: "abcdefgh", num: 1234567, inlined: false },
	2: { short: "xyz", num: 9, inlined: true }
};

it("should add and drop the inlined literal as the value crosses the size limit", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expected = EXPECTED[WATCH_STEP];
	expect(SHORT).toBe(expected.short);
	expect(NUM).toBe(expected.num);
	if (expected.inlined) {
		expect(source).toContain(
			`(/* ${MARK} .SHORT */${JSON.stringify(expected.short)})`
		);
		expect(source).toContain(`(/* ${MARK} .NUM */${expected.num})`);
	} else {
		expect(source).not.toContain(`${MARK} .SHORT`);
		expect(source).not.toContain(`${MARK} .NUM`);
	}
});
