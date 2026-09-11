import { VALUE } from "./env";
import { FROM_A } from "./a";
import { FROM_B } from "./b";
import { FROM_C } from "./c";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// This file is part of the bundle it reads, so the marker is assembled here
// to keep an assertion from matching its own source text.
const MARK = ["inlined", "export"].join(" ");

// Every consumer bakes in its own copy, so a hash that invalidates only one
// of them leaves the others stale.
it("should refresh the literal in every consumer that baked it in", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expected = Number(WATCH_STEP) + 1;
	expect(VALUE).toBe(expected);
	expect(FROM_A).toBe(expected);
	expect(FROM_B).toBe(expected);
	expect(FROM_C).toBe(expected);
	expect(source).not.toContain(`(/* ${MARK} .VALUE */${expected - 1})`);
});
