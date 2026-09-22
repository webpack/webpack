"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("keys an entry that is not javascript", () => {
	const files = manifest["./style.css"];
	expect(files).toBeDefined();
	expect(files).toContain("styles.css");
});
