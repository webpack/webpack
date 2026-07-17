"use strict";

const fs = require("fs");
const path = require("path");

require("./style.css");
require("./logo.svg");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

it("maps the entry module to its JS, CSS and asset files", () => {
	const files = manifest["./index.js"];
	expect(files).toBeDefined();
	expect(files.some((f) => f.endsWith(".js"))).toBe(true);
	expect(files.some((f) => f.endsWith(".css"))).toBe(true);
	expect(files.some((f) => f.endsWith(".svg"))).toBe(true);
});

it("maps a dynamically imported module to its own async chunk", () => {
	const files = manifest["./async.js"];
	expect(files).toBeDefined();
	expect(files.some((f) => f.endsWith(".js"))).toBe(true);
	// entry and async live in different chunks
	expect(files).not.toEqual(manifest["./index.js"]);
});

it("expands concatenated modules into individual source keys", () => {
	// helper is concatenated into async's chunk; it must still appear on its own
	expect(manifest["./helper.js"]).toEqual(manifest["./async.js"]);
});

it("loads the async chunk at runtime", () =>
	import("./async").then((m) => {
		expect(m.default).toBe(42);
	}));
