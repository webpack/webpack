"use strict";

const fs = require("fs");
const path = require("path");

const outputPath = __STATS__.outputPath;
const manifest = JSON.parse(
	fs.readFileSync(path.join(outputPath, "ssr-manifest.json"), "utf-8")
);

it("emits the maps the manifest has to filter out", () => {
	const files = fs.readdirSync(outputPath);
	expect(files).toContain("main.js.map");
	expect(files).toContain("async.js.map");
	expect(files).toContain("async.js.extra.map");
});

it("keeps source maps out of the manifest", () => {
	for (const files of Object.values(manifest)) {
		for (const file of files) expect(file.endsWith(".map")).toBe(false);
	}
});

it("still lists the chunk each module needs", () => {
	expect(manifest["./index.js"]).toContain("main.js");
	expect(manifest["./async.js"]).toContain("async.js");
});

it("loads the async chunk at runtime", () =>
	import(/* webpackChunkName: "async" */ "./async").then((m) => {
		expect(m.default).toBe(42);
	}));
