import { run } from "./feature.js";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// The losing branches are removed at build time, so a stale build keeps them.
it("should keep only the branch a changed define value selects", () => {
	expect(run()).toBe(`took-p${WATCH_STEP}`);
	const bundle = emitted("bundle.js");
	for (const other of ["0", "1", "2"]) {
		if (other !== WATCH_STEP) expect(bundle).not.toContain(`took-p${other}`);
	}
});
