const fs = require("fs");
const path = require("path");

const exists = (name) =>
	fs.existsSync(path.resolve(STATS_JSON.outputPath, "copied", name));

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should keep copied assets when cleaning the output directory", () => {
	expect(exists("keep.txt")).toBe(true);
});

it("should clean a copied asset whose file is gone", () => {
	expect(exists("remove.txt")).toBe(WATCH_STEP === "0");
});
