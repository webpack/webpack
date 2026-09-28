const fs = require("fs");
const path = require("path");

const exists = (name) =>
	fs.existsSync(path.resolve(STATS_JSON.outputPath, name));

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should keep only the extra asset of the current build", () => {
	const step = Number(WATCH_STEP);
	for (let i = 0; i <= step; i++) {
		expect(exists(`extra.${i}.txt`)).toBe(i === step);
	}
});

it("should keep an asset whose name goes through a directory", () => {
	expect(exists("kept.txt")).toBe(true);
});
