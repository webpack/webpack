const fs = require("fs");
const path = require("path");

const exists = (name) =>
	fs.existsSync(
		path.resolve(STATS_JSON.outputPath, "..", "copy-clean-outside-dry", name)
	);

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should only report stale copied files outside the output path in a dry run", () => {
	expect(exists("stay.txt")).toBe(true);
	expect(exists("remove.txt")).toBe(true);
	expect(exists("kept.txt")).toBe(true);
	expect(exists("added.txt")).toBe(WATCH_STEP === "2");
	expect(exists("foreign.txt")).toBe(true);
});
