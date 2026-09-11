import { run } from "./feature";
import "./trigger";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// The dead branch is removed at build time, so a cached consumer that kept the
// old branch is visible in the emitted source, not only in the return value.
it("should keep only the branch the current define value selects", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.js"),
		"utf8"
	);
	const step = Number(WATCH_STEP);
	expect(run()).toBe(`took-p${step}`);
	expect(source).toContain(`took-p${step}`);
	for (const other of [0, 1, 2]) {
		if (other !== step) expect(source).not.toContain(`took-p${other}`);
	}
});
