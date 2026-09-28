const fs = require("fs");
const path = require("path");

const exists = (name) =>
	fs.existsSync(path.resolve(STATS_JSON.outputPath, name));

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should keep every extra asset in dry mode", () => {
	for (let i = 0; i <= Number(WATCH_STEP); i++) {
		expect(exists(`extra.${i}.txt`)).toBe(true);
	}
});
