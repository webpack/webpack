const fs = require("fs");
const path = require("path");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should clean files written before a removal failed", () => {
	const directory = path.join(STATS_JSON.outputPath, "..", "outside-remove-failure");
	const files = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
	expect(files).toEqual(WATCH_STEP === "0" ? ["old.txt"] : []);
});
