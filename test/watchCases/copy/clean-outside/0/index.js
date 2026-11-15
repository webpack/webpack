const fs = require("fs");
const path = require("path");

const exists = (name) =>
	fs.existsSync(
		path.resolve(STATS_JSON.outputPath, "..", "copy-clean-outside", name)
	);

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should copy into an allowed directory outside the output path", () => {
	expect(exists("stay.txt")).toBe(true);
	expect(exists("added.txt")).toBe(WATCH_STEP === "2");
});

it("should clean a copied file outside the output path whose source is gone", () => {
	expect(exists("remove.txt")).toBe(WATCH_STEP === "0");
});

it("should keep a file the keep option matches", () => {
	expect(exists("kept.txt")).toBe(true);
});

it("should never remove a file webpack did not write", () => {
	expect(exists("foreign.txt")).toBe(true);
});
