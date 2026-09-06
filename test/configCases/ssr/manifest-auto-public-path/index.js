"use strict";

const fs = require("fs");
const path = require("path");

require("./page.js");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("falls back to a root-absolute base and warns about it", () => {
	const files = manifest["./index.js"];
	expect(files).toBeDefined();
	for (const file of files) expect(file.startsWith("/")).toBe(true);
});
