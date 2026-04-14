"use strict";

const fs = require("fs");
const path = require("path");

it("should generate a manifest without entrypoints when entrypoints: false is passed", () => {
	const manifestPath = path.join(__dirname, "manifest.json");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

	expect(manifest).not.toHaveProperty("entrypoints");
});
