const fs = require("fs");
const path = require("path");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should still write to the output file system what the additional output leaves out", () => {
	expect(fs.existsSync(path.resolve(STATS_JSON.outputPath, "skipped.txt"))).toBe(
		true
	);
});

it("should clean an asset named with a query once it is gone", () => {
	expect(fs.existsSync(path.resolve(STATS_JSON.outputPath, "dropped.txt"))).toBe(
		WATCH_STEP === "0"
	);
});
