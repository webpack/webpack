import { VALUE } from "./env";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// Built here so this file, which is part of the bundle it reads, cannot match
// its own source text.
const MARK = ["inlined", "export"].join(" ");

// A cycle peer may read an export in its dead zone, so a module that joins one
// stops being inlined and must start again once the cycle is gone.
it("should stop and resume inlining as a cycle forms and breaks", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const step = Number(WATCH_STEP);
	expect(VALUE).toBe(step + 1);
	expect(source.includes(`${MARK} .VALUE`)).toBe(step !== 1);
});
