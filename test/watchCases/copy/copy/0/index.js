const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.resolve(STATS_JSON.outputPath, "copied", name), "utf-8");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should copy the changed file on every rebuild", () => {
	expect(read("data.txt")).toBe(WATCH_STEP);
});

it("should copy a file added to the watched directory", () => {
	if (WATCH_STEP === "2") {
		expect(read("added.txt")).toBe("added");
	}
});

it("should not rewrite a copied file which did not change", () => {
	const asset = STATS_JSON.assets.find(
		(item) => item.name === "copied/constant.txt"
	);

	expect(asset.emitted).toBe(WATCH_STEP === "0");
});
