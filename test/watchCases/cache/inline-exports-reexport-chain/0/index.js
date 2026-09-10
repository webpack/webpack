import { LEAF } from "./barrel";
import { NAMED } from "./renamed";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// This file is part of the bundle it reads, so the marker is assembled here
// to keep an assertion from matching its own source text.
const MARK = ["inlined", "export"].join(" ");

it("should refresh a literal reached through a chain of re-exports", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const expected = Number(WATCH_STEP) + 1;
	expect(LEAF).toBe(expected);
	expect(NAMED).toBe(expected);
	// A renamed re-export still renders under the name the leaf exports
	expect(source).toContain(`(/* ${MARK} .LEAF */${expected})`);
	expect(source).not.toContain(`(/* ${MARK} .LEAF */${expected - 1})`);
});
