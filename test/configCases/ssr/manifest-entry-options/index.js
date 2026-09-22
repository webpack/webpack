"use strict";

const fs = require("fs");
const path = require("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("lists the entry that a `dependOn` entry is built against", () => {
	const files = manifest["./app.js"];
	expect(files).toBeDefined();
	// `dependOn` moves the shared modules into the other entry's chunk, so
	// `app.js` cannot run without it
	expect(files).toContain("shared.js");
});

it("lists the runtime chunk of an entry that has one of its own", () => {
	const files = manifest["./solo.js"];
	expect(files).toBeDefined();
	expect(files).toContain("rt.js");
});
