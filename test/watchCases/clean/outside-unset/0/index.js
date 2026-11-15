const fs = require("fs");
const path = require("path");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should never clean a file outside the output path without allowOutside", () => {
	const outside = path.resolve(STATS_JSON.outputPath, "..", "outside-unset");
	for (let step = 0; step <= Number(WATCH_STEP); step++) {
		expect(fs.existsSync(path.join(outside, `step.${step}.txt`))).toBe(true);
	}
});
