"use strict";

const fs = require("fs");
const path = require("path");

it("should respect falsy options in ProgressPlugin and ManifestPlugin", () => {
	const resultsFile = path.join(__dirname, "results.json");
	const results = JSON.parse(fs.readFileSync(resultsFile, "utf-8"));

	expect(results.showEntries).toBe(false);
	expect(results.showModules).toBe(false);
	expect(results.manifestEntrypoints).toBe(false);
});
